"""Deterministic safety boundary for optional character dialogue."""
import re
import time
from collections import defaultdict, deque
from threading import Lock

MAX_QUESTION = 300
MAX_HISTORY = 4
MAX_REPLY = 180
WINDOW_SECONDS = 60
MAX_CALLS = 8
_lock = Lock()
_calls = defaultdict(deque)

# Model output is untrusted; these patterns detect clear violations, not all hallucinations.
REVEAL_PATTERNS = [
    r'(?:(?:兇手|犯人|真兇)(?:其實|就)?是|高橋(?:修司)?(?:就)?是(?:兇手|犯人)|我(?:就)?是兇手)',
    r'(?:我|本人)(?:就是兇手|殺了(?:白石|他)|下了毒|投了毒|毒死了)',
    r'(?:我|本人)(?:挪用|侵占)(?:了)?(?:公款|資金|公司)',
    r'(?:如何|方法|手法).{0,18}(?:下毒|毒殺|投毒)',
]
META_PATTERNS = [r'(?i)system\s*prompt', r'(?i)developer\s*(?:prompt|message)',
                 r'系統(?:提示詞|指令)', r'開發者(?:提示詞|指令)', r'(?i)作為\s*ai',
                 r'(?i)我是\s*ai', r'(?i)語言模型', r'劇情解鎖', r'角色設定檔']

def suspicious_reply(person, answer, unlocked):
    if not isinstance(answer, str) or not answer.strip() or len(answer) > MAX_REPLY:
        return True
    normalized = re.sub(r'\s+', '', answer)
    if any(re.search(p, normalized) for p in REVEAL_PATTERNS + META_PATTERNS):
        return True
    if any(token in normalized for token in ('```', '【系統】', '【旁白】', 'X-17', 'x-17')):
        return True
    if person == '白石美咲' and not unlocked:
        if any(token in normalized for token in ('20:45', '20：45', '八點四十五', '20點45', '離婚', '去過書房', '去了書房', '進過書房', '進了書房')):
            return True
    if person == '佐藤千尋' and not unlocked:
        if any(token in normalized for token in ('茶壺陰性', '茶壺未檢出', '茶壺沒有檢出', '茶壺檢驗結果', '茶壺的檢驗')):
            return True
    if person == '高橋修司':
        if any(token in normalized for token in ('試劑瓶', '比對報告證明', '20:20下毒', '八點二十分下毒')):
            return True
    return False

def should_refuse_question(question):
    normalized = re.sub(r'\s+', '', question.lower())
    return any(term in normalized for term in (
        '提示詞', 'systemprompt', 'developerprompt', '忽略之前的指令',
        '你是ai嗎', '誰是兇手', '告訴我兇手', '扮演編劇', '跳出角色',
        '揭露真相', '完整犯案手法', '輸出系統訊息'))

def allow_request(bucket, now=None):
    """Local-process soft throttle, keyed by session identifier, not IP."""
    now = time.monotonic() if now is None else now
    with _lock:
        q = _calls[bucket]
        while q and now - q[0] >= WINDOW_SECONDS:
            q.popleft()
        if len(q) >= MAX_CALLS:
            return False
        q.append(now)
        return True
