"""
Log into chinesefor.us, load characters from db.json (shared with the
learning app) into the worksheet generator, and print/save as PDF —
one PDF per lesson/category. Appends a character reference sheet at the
end of each PDF with pinyin, meaning, stroke count, radical, and example words.
"""
import json
import os
import re
import subprocess
import tempfile
import time
import unicodedata
from datetime import datetime

from playwright.sync_api import sync_playwright
from PyPDF2 import PdfMerger
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def get_version() -> str:
    """Get version string from git hash + current date."""
    try:
        git_hash = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=BASE_DIR, stderr=subprocess.DEVNULL
        ).decode().strip()
    except Exception:
        git_hash = "nogit"
    date = datetime.now().strftime("%Y-%m-%d %H:%M")
    return f"v{git_hash} ({date})"


EMAIL = "208747@vutbr.cz"
PASSWORD = "inteligence25"
GENERATOR_URL = "https://chinesefor.us/chinese-character-worksheet-generator/"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "db.json")
LESSONS_DIR = os.path.join(BASE_DIR, "lessons_md")
OUTPUT_DIR = os.path.join(BASE_DIR, "worksheets")


def extract_characters_from_db() -> dict[str, list[str]]:
    """Extract unique Chinese characters from db.json, grouped by category."""
    with open(DB_PATH, encoding="utf-8") as f:
        db = json.load(f)
    by_category: dict[str, list[str]] = {}
    for entry in db["vocabulary"]:
        cat = entry.get("category", "uncategorized")
        if cat not in by_category:
            by_category[cat] = []
        for ch in entry["chinese"]:
            if "\u4e00" <= ch <= "\u9fff" and ch not in by_category[cat]:
                by_category[cat].append(ch)
    return by_category


def extract_characters_from_md(md_path: str) -> list[str]:
    """Fallback: extract unique Chinese characters from a markdown file."""
    with open(md_path, encoding="utf-8") as f:
        text = f.read()
    seen = set()
    chars = []
    for ch in re.findall(r'[\u4e00-\u9fff]', text):
        if ch not in seen:
            seen.add(ch)
            chars.append(ch)
    return chars


def generate_worksheet(page, chars: list[str], lesson_name: str, output_path: str):
    """Add characters to the generator and save as PDF."""

    # Navigate fresh each time
    page.goto(GENERATOR_URL, wait_until="networkidle", timeout=30000)
    time.sleep(2)

    # Delete placeholder character(s) first
    while True:
        delete_btns = page.query_selector_all("button.btn-delete")
        if not delete_btns:
            break
        delete_btns[0].click()
        time.sleep(0.3)

    # Set the worksheet header/title
    header_input = page.query_selector('input.form-control:not([placeholder="Type characters..."])')
    if header_input:
        header_input.fill("")
        header_input.fill(lesson_name)
        time.sleep(0.3)

    # Add characters one by one
    char_input = page.query_selector('input[placeholder="Type characters..."]')
    add_btn = page.query_selector('button.btn-primary')

    for ch in chars:
        char_input.fill(ch)
        time.sleep(0.2)
        add_btn.click()
        time.sleep(0.5)

    # Wait for worksheet to render
    time.sleep(2)

    # Save as PDF using browser print
    page.pdf(
        path=output_path,
        format="A4",
        print_background=True,
        margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"},
    )
    print(f"  Saved: {output_path}")


##############################################################################
# Character reference sheet generation
##############################################################################

# CJK Unified Ideographs radical table (Unicode radical index)
# Maps some common radicals by stroke-based lookup
CJK_RADICALS = {
    "我": ("戈", "halberd"),
    "他": ("亻", "person"),
    "她": ("女", "woman"),
    "想": ("心", "heart"),
    "吃": ("口", "mouth"),
    "饭": ("饣", "food/eat"),
    "学": ("子", "child"),
    "习": ("乙", "second"),
    "加": ("力", "power"),
    "油": ("氵", "water"),
    "中": ("丨", "line"),
    "国": ("囗", "enclosure"),
    "普": ("日", "sun"),
    "通": ("辶", "walk"),
    "话": ("讠", "speech"),
    "语": ("讠", "speech"),
    "简": ("竹", "bamboo"),
    "体": ("亻", "person"),
    "字": ("宀", "roof"),
    "繁": ("糸", "silk"),
    "你": ("亻", "person"),
    "好": ("女", "woman"),
    "叫": ("口", "mouth"),
    "是": ("日", "sun"),
    "不": ("一", "one"),
    "的": ("白", "white"),
    "了": ("乙", "second"),
    "在": ("土", "earth"),
    "人": ("人", "person"),
    "大": ("大", "big"),
    "有": ("月", "moon"),
    "这": ("辶", "walk"),
    "那": ("阝", "city"),
    "什": ("亻", "person"),
    "么": ("丿", "slash"),
    "很": ("彳", "step"),
    "没": ("氵", "water"),
    "会": ("人", "person"),
    "能": ("月", "moon"),
    "说": ("讠", "speech"),
    "看": ("目", "eye"),
    "来": ("木", "tree"),
    "去": ("土", "earth"),
    "做": ("亻", "person"),
    "到": ("刂", "knife"),
    "多": ("夕", "evening"),
    "少": ("小", "small"),
    "快": ("忄", "heart"),
    "慢": ("忄", "heart"),
    "高": ("高", "tall"),
    "矮": ("矢", "arrow"),
    "冷": ("冫", "ice"),
    "热": ("灬", "fire"),
    "对": ("又", "again"),
    "错": ("钅", "metal"),
    "开": ("廾", "hands"),
    "关": ("丷", "eight"),
    "上": ("一", "one"),
    "下": ("一", "one"),
    "里": ("里", "village"),
    "外": ("夕", "evening"),
    "前": ("刂", "knife"),
    "后": ("口", "mouth"),
    "买": ("乙", "second"),
    "卖": ("十", "ten"),
    "读": ("讠", "speech"),
    "写": ("冖", "cover"),
    "听": ("口", "mouth"),
    "喝": ("口", "mouth"),
    "睡": ("目", "eye"),
    "觉": ("见", "see"),
    "住": ("亻", "person"),
    "坐": ("土", "earth"),
    "站": ("立", "stand"),
    "走": ("走", "walk"),
    "跑": ("足", "foot"),
    "飞": ("飞", "fly"),
    "打": ("扌", "hand"),
    "电": ("田", "field"),
    "脑": ("月", "moon"),
    "手": ("手", "hand"),
    "机": ("木", "tree"),
    "书": ("乙", "second"),
    "本": ("木", "tree"),
    "笔": ("竹", "bamboo"),
    "纸": ("纟", "silk"),
    "桌": ("木", "tree"),
    "椅": ("木", "tree"),
    "门": ("门", "gate"),
    "窗": ("穴", "cave"),
    "床": ("广", "shelter"),
    "灯": ("火", "fire"),
    "水": ("水", "water"),
    "火": ("火", "fire"),
    "山": ("山", "mountain"),
    "花": ("艹", "grass"),
    "草": ("艹", "grass"),
    "树": ("木", "tree"),
    "鱼": ("鱼", "fish"),
    "鸟": ("鸟", "bird"),
    "狗": ("犭", "dog"),
    "猫": ("犭", "dog"),
    "牛": ("牛", "cow"),
    "马": ("马", "horse"),
    "羊": ("羊", "sheep"),
    "鸡": ("鸟", "bird"),
    "蛋": ("虫", "insect"),
    # Lesson 2 additions
    "汉": ("氵", "water"),
    "一": ("一", "one"),
    "二": ("二", "two"),
    "三": ("一", "one"),
    "四": ("囗", "enclosure"),
    "五": ("一", "one"),
    "六": ("亠", "lid"),
    "七": ("一", "one"),
    "八": ("八", "eight"),
    "九": ("丿", "slash"),
    "十": ("十", "ten"),
    "百": ("白", "white"),
    "千": ("十", "ten"),
    "零": ("雨", "rain"),
    "末": ("木", "tree"),
    "日": ("日", "sun"),
    "明": ("日", "sun"),
    "木": ("木", "tree"),
    "休": ("亻", "person"),
    "女": ("女", "woman"),
    "河": ("氵", "water"),
    "情": ("忄", "heart"),
    "妈": ("女", "woman"),
    "自": ("自", "self"),
    "老": ("老", "old"),
    "考": ("老", "old"),
    "来": ("木", "tree"),
    "两": ("一", "one"),
    "是": ("日", "sun"),
    "米": ("米", "rice"),
    "面": ("面", "face"),
    "菜": ("艹", "grass"),
    "茶": ("艹", "grass"),
    "酒": ("氵", "water"),
    "肉": ("月", "moon"),
    "果": ("木", "tree"),
    "苹": ("艹", "grass"),
}

# Common example words for HSK1-level characters
EXAMPLE_WORDS = {
    "我": [("我们", "wǒmen", "my/nás")],
    "他": [("他们", "tāmen", "oni/them")],
    "她": [("她们", "tāmen", "ony/them (f.)")],
    "想": [("想要", "xiǎngyào", "chtít/want"), ("想念", "xiǎngniàn", "stýskat se/miss")],
    "吃": [("吃饭", "chīfàn", "jíst/eat"), ("好吃", "hǎochī", "chutný/delicious")],
    "饭": [("米饭", "mǐfàn", "rýže/rice"), ("饭店", "fàndiàn", "restaurace/restaurant")],
    "学": [("学生", "xuéshēng", "student"), ("学校", "xuéxiào", "škola/school")],
    "习": [("学习", "xuéxí", "učit se/study"), ("练习", "liànxí", "cvičit/practice")],
    "加": [("加油", "jiāyóu", "do toho!/go for it"), ("参加", "cānjiā", "zúčastnit se/join")],
    "油": [("加油", "jiāyóu", "do toho!/go for it"), ("油", "yóu", "olej/oil")],
    "中": [("中国", "Zhōngguó", "Čína/China"), ("中间", "zhōngjiān", "uprostřed/middle")],
    "国": [("中国", "Zhōngguó", "Čína/China"), ("国家", "guójiā", "stát/country")],
    "普": [("普通", "pǔtōng", "běžný/common"), ("普通话", "pǔtōnghuà", "mandarínština")],
    "通": [("普通", "pǔtōng", "běžný/common"), ("交通", "jiāotōng", "doprava/traffic")],
    "话": [("说话", "shuōhuà", "mluvit/speak"), ("电话", "diànhuà", "telefon/phone")],
    "语": [("汉语", "Hànyǔ", "čínština/Chinese"), ("语言", "yǔyán", "jazyk/language")],
    "简": [("简单", "jiǎndān", "jednoduchý/simple"), ("简体", "jiǎntǐ", "zjednodušený")],
    "体": [("身体", "shēntǐ", "tělo/body"), ("简体字", "jiǎntǐzì", "zjedn. znaky")],
    "字": [("汉字", "Hànzì", "čínské znaky"), ("写字", "xiězì", "psát/write")],
    "繁": [("繁体字", "fántǐzì", "tradiční znaky"), ("繁忙", "fánmáng", "zaneprázdněný/busy")],
    "你": [("你好", "nǐhǎo", "ahoj/hello"), ("你们", "nǐmen", "vy/you (pl.)")],
    "好": [("你好", "nǐhǎo", "ahoj/hello"), ("好的", "hǎode", "dobře/OK")],
    "叫": [("叫做", "jiàozuò", "jmenovat se/called"), ("我叫", "wǒ jiào", "jmenuji se")],
    "是": [("是的", "shìde", "ano/yes"), ("不是", "bùshì", "ne/no")],
    "不": [("不好", "bùhǎo", "špatný/bad"), ("不是", "bùshì", "není/not")],
    "快": [("快乐", "kuàilè", "šťastný/happy"), ("快速", "kuàisù", "rychlý/fast")],
    "没": [("没有", "méiyǒu", "nemít/not have"), ("没关系", "méiguānxi", "nevadí/no problem")],
    # Lesson 2
    "汉": [("汉字", "hànzì", "čínské znaky"), ("汉语", "hànyǔ", "čínština")],
    "一": [("一个", "yī gè", "jeden (kus)"), ("第一", "dì yī", "první")],
    "二": [("第二", "dì èr", "druhý"), ("二月", "èryuè", "únor")],
    "三": [("三个", "sān gè", "tři (kusy)"), ("三月", "sānyuè", "březen")],
    "十": [("十一", "shíyī", "jedenáct"), ("十月", "shíyuè", "říjen")],
    "百": [("一百", "yībǎi", "sto"), ("百分之", "bǎifēnzhī", "procento")],
    "千": [("一千", "yīqiān", "tisíc")],
    "上": [("上午", "shàngwǔ", "dopoledne"), ("上学", "shàngxué", "jít do školy")],
    "下": [("下午", "xiàwǔ", "odpoledne"), ("下雨", "xiàyǔ", "pršet")],
    "日": [("日本", "Rìběn", "Japonsko"), ("生日", "shēngrì", "narozeniny")],
    "明": [("明天", "míngtiān", "zítra"), ("明白", "míngbai", "rozumět")],
    "木": [("树木", "shùmù", "stromy")],
    "人": [("人们", "rénmen", "lidé"), ("大人", "dàrén", "dospělý")],
    "女": [("女人", "nǚrén", "žena"), ("女孩", "nǚhái", "dívka")],
    "河": [("河水", "héshuǐ", "říční voda"), ("大河", "dàhé", "velká řeka")],
    "妈": [("妈妈", "māma", "maminka"), ("大妈", "dàmā", "teta (oslovení)")],
    "马": [("马上", "mǎshàng", "hned/ihned"), ("小马", "xiǎomǎ", "poník")],
    "来": [("过来", "guòlái", "pojď sem"), ("回来", "huílái", "vrátit se")],
    "老": [("老师", "lǎoshī", "učitel"), ("老人", "lǎorén", "starý člověk")],
    "休": [("休息", "xiūxi", "odpočívat")],
    "本": [("本子", "běnzi", "sešit"), ("日本", "Rìběn", "Japonsko")],
    "四": [("四月", "sìyuè", "duben/April"), ("四个", "sì gè", "čtyři (kusy)")],
    "五": [("五月", "wǔyuè", "květen/May"), ("五个", "wǔ gè", "pět (kusů)")],
    "六": [("六月", "liùyuè", "červen/June"), ("六个", "liù gè", "šest (kusů)")],
    "七": [("七月", "qīyuè", "červenec/July")],
    "八": [("八月", "bāyuè", "srpen/August")],
    "九": [("九月", "jiǔyuè", "září/September")],
    "零": [("零钱", "língqián", "drobné/change")],
    "末": [("周末", "zhōumò", "víkend/weekend"), ("末尾", "mòwěi", "konec/end")],
    "情": [("事情", "shìqing", "věc, záležitost/thing"), ("心情", "xīnqíng", "nálada/mood")],
    "自": [("自己", "zìjǐ", "sám/oneself"), ("自然", "zìrán", "příroda/nature")],
    "考": [("考试", "kǎoshì", "zkouška/exam"), ("思考", "sīkǎo", "přemýšlet/think")],
    "月": [("月亮", "yuèliang", "měsíc (na nebi)/moon"), ("一月", "yīyuè", "leden/January")],
    "两": [("两个", "liǎng gè", "dva (kusy)"), ("两天", "liǎng tiān", "dva dny")],
}


def get_stroke_count(char: str) -> int:
    """Get approximate stroke count from Unicode CJK data."""
    # Use the unihan database approximation based on radical-stroke
    # For a rough approach, we use a lookup table for common chars
    stroke_counts = {
        "一": 1, "二": 2, "三": 3, "人": 2, "大": 3, "小": 3,
        "中": 4, "国": 8, "我": 7, "你": 7, "他": 5, "她": 6,
        "好": 6, "是": 9, "不": 4, "的": 8, "了": 2, "在": 6,
        "有": 6, "这": 7, "那": 6, "什": 4, "么": 3, "很": 9,
        "想": 13, "吃": 6, "饭": 7, "学": 8, "习": 3, "加": 5,
        "油": 8, "普": 12, "通": 10, "话": 8, "语": 9, "简": 13,
        "体": 7, "字": 6, "繁": 17, "叫": 5, "快": 7, "没": 7,
        "会": 6, "能": 10, "说": 9, "看": 9, "来": 7, "去": 5,
        "做": 11, "到": 8, "多": 6, "少": 4, "慢": 14, "高": 10,
        "对": 5, "错": 13, "开": 4, "关": 6, "上": 3, "下": 3,
        "买": 6, "卖": 8, "读": 10, "写": 5, "听": 7, "喝": 12,
        "睡": 13, "觉": 9, "住": 7, "坐": 7, "站": 10, "走": 7,
        "跑": 12, "飞": 3, "打": 5, "电": 5, "脑": 10, "手": 4,
        "机": 6, "书": 4, "本": 5, "笔": 10, "门": 3, "水": 4,
        "火": 4, "山": 3, "花": 7, "树": 9, "鱼": 8, "鸟": 5,
        "狗": 8, "猫": 11, "牛": 4, "马": 3, "米": 6, "茶": 9,
        # Lesson 2 additions
        "两": 7, "汉": 5, "一": 1, "二": 2, "三": 3, "四": 5, "五": 4,
        "六": 4, "七": 2, "八": 2, "九": 2, "十": 2, "百": 6,
        "千": 3, "零": 13, "末": 5, "日": 4, "明": 8, "木": 4,
        "休": 6, "女": 3, "河": 8, "情": 11, "妈": 6, "自": 6,
        "老": 6, "考": 6, "来": 7,
    }
    return stroke_counts.get(char, 0)


def get_char_info(char: str, db_entries: dict) -> dict:
    """Build info dict for a character using db.json + built-in tables."""
    info = {
        "char": char,
        "pinyin": "",
        "meaning": "",
        "strokes": get_stroke_count(char),
        "radical": "",
        "radical_meaning": "",
        "examples": [],
    }

    # Get pinyin + meaning from db.json entries
    if char in db_entries:
        entry = db_entries[char]
        info["pinyin"] = entry.get("pinyin", "")
        info["meaning"] = entry.get("meaning", "")

    # Radical
    if char in CJK_RADICALS:
        rad, rad_meaning = CJK_RADICALS[char]
        info["radical"] = rad
        info["radical_meaning"] = rad_meaning

    # Example words
    if char in EXAMPLE_WORDS:
        info["examples"] = EXAMPLE_WORDS[char]

    return info


def _register_fonts():
    """Register fonts that support both Czech diacritics and CJK characters."""
    cjk_font = None
    text_font = None

    # CJK font for Chinese characters
    cjk_paths = [
        "C:/Windows/Fonts/msyh.ttc",     # Microsoft YaHei
        "C:/Windows/Fonts/simsun.ttc",    # SimSun
        "C:/Windows/Fonts/simhei.ttf",    # SimHei
    ]
    for fp in cjk_paths:
        if os.path.exists(fp):
            try:
                pdfmetrics.registerFont(TTFont("CJK", fp))
                cjk_font = "CJK"
                break
            except Exception:
                continue

    # Text font that supports Czech diacritics (ě, š, č, ř, ž, ů, etc.)
    text_paths = [
        ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/segoeuib.ttf"),   # Segoe UI
        ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),       # Arial
        ("C:/Windows/Fonts/calibri.ttf", "C:/Windows/Fonts/calibrib.ttf"),    # Calibri
    ]
    for regular, bold in text_paths:
        if os.path.exists(regular):
            try:
                pdfmetrics.registerFont(TTFont("TextFont", regular))
                if os.path.exists(bold):
                    pdfmetrics.registerFont(TTFont("TextFont-Bold", bold))
                text_font = "TextFont"
                break
            except Exception:
                continue

    if not text_font:
        text_font = "Helvetica"
    if not cjk_font:
        cjk_font = text_font

    return cjk_font, text_font


def generate_reference_pdf(chars: list[str], lesson_name: str, output_path: str,
                           db_entries: dict):
    """Generate a character reference sheet PDF using reportlab."""
    cjk_font, text_font = _register_fonts()
    bold_font = text_font + "-Bold" if text_font == "TextFont" else "Helvetica-Bold"

    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        topMargin=15*mm, bottomMargin=15*mm,
        leftMargin=15*mm, rightMargin=15*mm,
    )

    styles = getSampleStyleSheet()

    # Custom styles — use text_font for Czech text, cjk_font only for Chinese chars
    title_style = ParagraphStyle(
        "RefTitle", parent=styles["Heading1"],
        fontName=text_font, fontSize=18, spaceAfter=6*mm, alignment=TA_CENTER,
    )
    char_style = ParagraphStyle(
        "CharBig", parent=styles["Normal"],
        fontName=cjk_font, fontSize=36, alignment=TA_CENTER, leading=42,
    )
    info_style = ParagraphStyle(
        "CharInfo", parent=styles["Normal"],
        fontName=text_font, fontSize=10, leading=14,
    )
    pinyin_style = ParagraphStyle(
        "Pinyin", parent=styles["Normal"],
        fontName=bold_font, fontSize=14, alignment=TA_CENTER, leading=18,
    )
    meaning_style = ParagraphStyle(
        "Meaning", parent=styles["Normal"],
        fontName=text_font, fontSize=11, alignment=TA_CENTER,
        textColor=colors.HexColor("#444444"), leading=14,
    )
    example_style = ParagraphStyle(
        "Example", parent=styles["Normal"],
        fontName=text_font, fontSize=9, leading=12,
        textColor=colors.HexColor("#333333"),
    )

    version_style = ParagraphStyle(
        "Version", parent=styles["Normal"],
        fontName=text_font, fontSize=7, alignment=TA_CENTER,
        textColor=colors.HexColor("#999999"),
    )

    version = get_version()
    story = []
    story.append(Paragraph(f"{lesson_name} \u2014 Character Reference", title_style))
    story.append(Paragraph(f"Generated: {version}", version_style))
    story.append(Spacer(1, 4*mm))

    char_infos = [get_char_info(ch, db_entries) for ch in chars]

    for i, ci in enumerate(char_infos):
        # Character card as a mini-table
        examples_text = ""
        if ci["examples"]:
            ex_parts = []
            for word, py, meaning in ci["examples"]:
                ex_parts.append(
                    f"<font name='{cjk_font}'>{word}</font> "
                    f"<font name='{text_font}'>({py}) \u2014 {meaning}</font>"
                )
            examples_text = "<br/>".join(ex_parts)

        radical_text = ""
        if ci["radical"]:
            radical_text = (
                f"<font name='{cjk_font}'>{ci['radical']}</font> "
                f"<font name='{text_font}'>({ci['radical_meaning']})</font>"
            )

        card_data = [
            [
                Paragraph(f"<font name='{cjk_font}'>{ci['char']}</font>", char_style),
                [
                    Paragraph(f"<font name='{bold_font}'>{ci['pinyin']}</font>", pinyin_style),
                    Paragraph(f"<font name='{text_font}'>{ci['meaning']}</font>", meaning_style),
                ],
            ],
            [
                "",
                Paragraph(
                    f"<font name='{text_font}'>Strokes: {ci['strokes'] or '?'}  |  "
                    f"Radical: </font>{radical_text or '?'}",
                    info_style,
                ),
            ],
        ]

        if examples_text:
            card_data.append([
                "",
                Paragraph(
                    f"<font name='{bold_font}'>{chr(0x50)}{chr(0x159)}{chr(0xed)}klady:</font> "
                    f"{examples_text}",
                    example_style,
                ),
            ])

        card_table = Table(card_data, colWidths=[30*mm, 140*mm])
        card_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("SPAN", (0, 0), (0, -1)),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CCCCCC")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#EEEEEE")),
            ("TOPPADDING", (0, 0), (-1, -1), 3*mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3*mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 3*mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3*mm),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F8F8F8")),
        ]))

        story.append(card_table)
        story.append(Spacer(1, 3*mm))

    doc.build(story)
    print(f"  Reference sheet: {output_path}")


def merge_pdfs(worksheet_path: str, reference_path: str, output_path: str):
    """Merge worksheet and reference PDFs into one file."""
    merger = PdfMerger()
    merger.append(worksheet_path)
    merger.append(reference_path)
    merger.write(output_path)
    merger.close()


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Primary: read from db.json (shared with learning app)
    # Fallback: read from lesson MDs
    lessons = []
    if os.path.exists(DB_PATH):
        print(f"Reading characters from {DB_PATH}")
        by_cat = extract_characters_from_db()
        for cat in sorted(by_cat):
            chars = by_cat[cat]
            if chars:
                lesson_name = cat.replace("-", " ").title()
                fname = cat.replace(" ", "_") + "_worksheet.pdf"
                lessons.append((lesson_name, chars, fname))
    else:
        print(f"db.json not found, falling back to lesson MDs")
        for fname in sorted(os.listdir(LESSONS_DIR)):
            if not fname.endswith(".md"):
                continue
            md_path = os.path.join(LESSONS_DIR, fname)
            chars = extract_characters_from_md(md_path)
            if chars:
                lesson_name = fname.replace(".md", "").replace("_", " ").title()
                lessons.append((lesson_name, chars, fname.replace(".md", "_worksheet.pdf")))

    if not lessons:
        print("No Chinese characters found.")
        return

    # Build db lookup: char -> entry (for reference sheet info)
    db_entries = {}
    if os.path.exists(DB_PATH):
        with open(DB_PATH, encoding="utf-8") as f:
            db = json.load(f)
        for entry in db.get("vocabulary", []):
            # Map individual chars AND full words
            for ch in entry["chinese"]:
                if "\u4e00" <= ch <= "\u9fff" and ch not in db_entries:
                    db_entries[ch] = entry
            # Also store full word so multi-char entries get their pinyin
            if len(entry["chinese"]) == 1:
                db_entries[entry["chinese"]] = entry

    print(f"Found {len(lessons)} category/lesson(s) with Chinese characters:\n")
    for name, chars, _ in lessons:
        print(f"  {name}: {''.join(chars)} ({len(chars)} chars)")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Log in
        print("\nLogging in...")
        page.goto(GENERATOR_URL, wait_until="networkidle", timeout=30000)

        login_field = page.query_selector('input[name="username"], input#username')
        if login_field:
            login_field.fill(EMAIL)
            page.query_selector('input[name="password"], input#password').fill(PASSWORD)
            page.query_selector('button[type="submit"], input[type="submit"]').click()
            page.wait_for_load_state("networkidle", timeout=30000)
            print(f"  Logged in. URL: {page.url}")

        # Generate worksheet + reference sheet for each lesson, then merge
        for lesson_name, chars, fname in lessons:
            print(f"\nGenerating worksheet for {lesson_name} ({len(chars)} characters)...")

            ws_path = os.path.join(OUTPUT_DIR, "_tmp_worksheet.pdf")
            ref_path = os.path.join(OUTPUT_DIR, "_tmp_reference.pdf")
            final_path = os.path.join(OUTPUT_DIR, fname)

            # 1. Generate worksheet from chinesefor.us
            generate_worksheet(page, chars, lesson_name, ws_path)

            # 2. Generate reference sheet
            print(f"  Generating reference sheet...")
            generate_reference_pdf(chars, lesson_name, ref_path, db_entries)

            # 3. Merge into one PDF
            print(f"  Merging into final PDF...")
            merge_pdfs(ws_path, ref_path, final_path)
            print(f"  Final: {final_path}")

            # Clean up temp files
            os.remove(ws_path)
            os.remove(ref_path)

        browser.close()

    print(f"\nDone! Worksheets saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
