import os
import secrets
from pathlib import Path
from dotenv import load_dotenv
from openai import AuthenticationError, RateLimitError, APIConnectionError, APITimeoutError, BadRequestError, NotFoundError, APIStatusError

# 讀取與 app.py 同一資料夾的 .env；不覆蓋已設定的系統環境變數。
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=False)

from flask import Flask, render_template, request, jsonify, session

app = Flask(__name__)
# 正式環境必須由部署平台設定固定的 FLASK_SECRET_KEY；本機才允許自動產生密鑰。
secret_file = Path(__file__).resolve().parent / '.flask_secret_key'
if os.environ.get('FLASK_SECRET_KEY'):
    app.secret_key = os.environ['FLASK_SECRET_KEY']
else:
    if os.environ.get('APP_ENV', '').lower() == 'production':
        raise RuntimeError('正式環境缺少 FLASK_SECRET_KEY，請在部署平台的 Variables 設定。')
    if not secret_file.exists():
        secret_file.write_text(secrets.token_hex(32), encoding='utf-8')
        try:
            secret_file.chmod(0o600)
        except OSError:
            pass
    app.secret_key = secret_file.read_text(encoding='utf-8').strip()
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get('APP_ENV', '').lower() == 'production',
    MAX_CONTENT_LENGTH=16 * 1024,
)

@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['X-Frame-Options'] = 'DENY'
    return response

@app.get('/health')
def health():
    return jsonify(status='ok')


from character_bible import CHARACTER_BIBLE, build_instructions, safe_fallback
from ai_policy import MAX_QUESTION, MAX_HISTORY, allow_request, should_refuse_question, suspicious_reply

CHARACTERS = CHARACTER_BIBLE
DEDUCTION_REQUIREMENTS = {'lie': {'corridor', 'divorce'}, 'room': {'cup', 'forensic', 'lock', 'doorhabit', 'teapot'}, 'motive': {'finance', 'records'}, 'opportunity': {'storage', 'diary', 'trace', 'vial', 'comparison', 'teapot'}}
DEDUCTION_ANSWERS = {'lie': [0, 1, 1], 'room': [1, 0, 1], 'motive': [0, 1, 0], 'opportunity': [1, 0, 1]}
VERDICT_ANSWERS = ['高橋修司', '掩蓋挪用資金', '事先接觸茶杯，死者自行鎖門', '財務、接觸與鑑識證據']

# 只有經過設計、可核實的固定證詞能觸發劇情；AI 回答不可作為解鎖依據。
STATEMENT_RULES = {
    '白石美咲': {'id': 'misaki_alibi', 'proofs': {'corridor', 'divorce'}, 'required': {'corridor', 'divorce'}},
    '高橋修司': {'id': 'takahashi_cup', 'proofs': {'storage', 'diary', 'trace', 'vial', 'comparison', 'teapot'}, 'required': {'storage', 'diary', 'trace', 'vial', 'comparison', 'teapot'}},
    '佐藤千尋': {'id': 'chihiro_tea', 'proofs': {'teapot', 'tea', 'storage'}, 'required': {'teapot', 'tea', 'storage'}},
}

SCENE_EVIDENCE = {
    '書房': {'cup','clock','lock','doorhabit','letter'},
    '客廳': {'divorce'}, '二樓走廊': {'corridor'},
    '廚房': {'tea','storage'},
    '私人辦公室': {'finance','diary','records','vial'},
    '調查局系統': {'forensic','trace','comparison','teapot'},
}
LAB_EVIDENCE = SCENE_EVIDENCE['調查局系統']

EVIDENCE_IDS = {'cup','clock','lock','letter','divorce','corridor','tea','storage','finance','diary','forensic','records','trace','vial','comparison','teapot','doorhabit'}

def progress():
    return session.get('case001', {'found': [], 'lab': False, 'challenges': [], 'deductions': {}, 'scene': None})

@app.get('/api/progress')
def get_progress():
    return jsonify(progress())

@app.post('/api/progress')
def update_progress():
    data = request.get_json(silent=True) or {}
    action = data.get('action')
    p = progress()
    found = set(p['found'])
    if action == 'visit':
        scene = data.get('scene')
        if scene not in SCENE_EVIDENCE:
            return jsonify(error='未知調查地點'), 400
        p['scene'] = scene
    elif action == 'reset':
        p = {'found': [], 'lab': False, 'challenges': [], 'deductions': {}, 'scene': None}
    elif action == 'collect':
        item = data.get('id')
        if item not in EVIDENCE_IDS:
            return jsonify(error='無效證物'), 400
        if item not in SCENE_EVIDENCE.get(p.get('scene'), set()):
            return jsonify(error='請先前往證物所在的調查地點'), 409
        if item in LAB_EVIDENCE and not (p['lab'] and 'cup' in found and (item != 'comparison' or 'vial' in found)):
            return jsonify(error='尚未完成鑑識申請'), 409
        found.add(item)
        p['found'] = sorted(found)
    elif action == 'collect_lab':
        item = data.get('id')
        if item not in LAB_EVIDENCE:
            return jsonify(error='不是鑑識資料'), 400
        if not p['lab'] or 'cup' not in found or (item == 'comparison' and 'vial' not in found):
            return jsonify(error='尚未符合鑑識資料的領取條件'), 409
        found.add(item)
        p['found'] = sorted(found)
    elif action == 'lab':
        if 'cup' not in found:
            return jsonify(error='必須先登記茶杯'), 409
        p['lab'] = True
    elif action == 'challenge':
        person = data.get('person')
        proof = data.get('proof')
        statement = data.get('statement_id')
        rule = STATEMENT_RULES.get(person)
        valid = bool(rule and statement == rule['id'] and proof in rule['proofs'] and rule['required'] <= found)
        if not valid:
            return jsonify(error='證詞或證據不符，請選擇可核對的固定證詞'), 409
        if person not in p['challenges']:
            p['challenges'].append(person)
    elif action == 'deduce':
        topic = data.get('topic')
        step = data.get('step')
        answer = data.get('answer')
        if topic not in DEDUCTION_ANSWERS or type(step) is not int or type(answer) is not int:
            return jsonify(error='無效推理資料'), 400
        answers = DEDUCTION_ANSWERS[topic]
        current = p.setdefault('deductions', {}).get(topic, 0)
        if not DEDUCTION_REQUIREMENTS[topic] <= found or step != current or step >= len(answers):
            return jsonify(error='推理進度或證據不足'), 409
        if answer != answers[step]:
            return jsonify(error='推論缺乏證據支持，請重新判斷'), 422
        p['deductions'][topic] = current + 1
    else:
        return jsonify(error='未知操作'), 400
    session['case001'] = p
    if action == 'reset':
        session.pop('ai_chat', None)
    return jsonify(ok=True, progress=p)


@app.post('/api/verdict')
def verdict():
    data = request.get_json(silent=True) or {}
    answers = data.get('answers')
    if not isinstance(answers, list) or len(answers) != 4 or not all(isinstance(x, str) for x in answers):
        return jsonify(error='請回答全部四道結案問題'), 400
    p = progress()
    # 結案權限由伺服器驗證，避免直接呼叫 API 跳過推理關卡。
    deductions = p.get('deductions', {})
    missing_deductions = [k for k, steps in DEDUCTION_ANSWERS.items()
                          if deductions.get(k, 0) != len(steps)]
    if missing_deductions:
        return jsonify(error='請先完成推理分析的四個主要疑點',
                       missing_deductions=missing_deductions), 403
    found = set(p.get('found', []))
    missing_evidence = sorted(EVIDENCE_IDS - found)
    ready = not missing_evidence
    correct = answers == VERDICT_ANSWERS
    return jsonify(success=bool(ready and correct), ready=ready,
                   correct=correct, missing_evidence=missing_evidence,
                   missing_deductions=[], missing_challenges=[])



@app.route('/')
def home():
    return render_template('game.html')

@app.get('/api/ai-status')
def ai_status():
    """Local configuration check only: does not send a billable request or expose secrets."""
    key = os.environ.get('OPENAI_API_KEY', '').strip()
    model = os.environ.get('OPENAI_MODEL', 'gpt-4.1-mini').strip()
    configured = bool(key and key != 'your_api_key_here' and key.startswith('sk-'))
    return jsonify(configured=configured, model=model, online_verified=False,
                   message=('已偵測到 API 金鑰；尚未測試網路連線與額度。' if configured else
                            '尚未讀取到有效格式的 OPENAI_API_KEY，請檢查 app.py 同層的 .env，並重新啟動伺服器。'))

# V24 離線備援：只有事先編寫的安全回答，不會聲稱是 AI，也不會改動案件進度。
FALLBACK_TOPICS = {
    '白石美咲': [(['離婚','婚姻','爭吵'], '我和丈夫的關係確實不好，但婚姻問題不等於殺人。'),
               (['時間','在哪','行蹤','八點'], '我原本說八點後都待在房間。若你有其他紀錄，就拿給我看。')],
    '白石悠真': [(['錢','債','財產'], '我有財務壓力，但這不能證明我傷害了父親。'),
               (['時間','在哪','行蹤'], '我當時待在客廳，沒有進過書房。')],
    '高橋修司': [(['帳','資金','挪用','公司'], '董事長最近在核對帳目。具體內容應以公司紀錄為準。'),
               (['茶','杯','九點','時間'], '我說的是九點以後沒再進書房。茶具整理是在更早之前。')],
    '佐藤千尋': [(['茶','杯','廚房'], '我在八點三十五分送茶。杯子在送茶之前也有人整理過。'),
               (['時間','在哪','行蹤'], '送完茶後，我回到廚房繼續工作。')],
}

def scripted_interrogation(person, question, unlocked=False):
    # 故意不根據玩家暗示改寫既定事實。
    if should_refuse_question(question):
        return safe_fallback(person, unlocked)
    for words, reply in FALLBACK_TOPICS[person]:
        if any(word in question for word in words):
            return reply
    return safe_fallback(person, unlocked)

def offline_answer(person, question, code='offline'):
    return jsonify(answer=scripted_interrogation(person, question,
                       person in set(progress().get('challenges', []))),
                   mode='scripted', code=code,
                   notice='目前使用預設劇情回答（非即時 AI），可繼續完成案件。')

@app.post('/api/interrogate')
def interrogate():
    payload = request.get_json(silent=True) or {}
    person = payload.get('person')
    question = payload.get('question', '')
    if person not in CHARACTERS or not isinstance(question, str) or not 1 <= len(question.strip()) <= MAX_QUESTION:
        return jsonify(error='人物或問題不正確。'), 400
    if should_refuse_question(question):
        return jsonify(answer=safe_fallback(person, person in set(progress()['challenges'])), guarded=True, mode='scripted')
    if 'ai_bucket' not in session:
        session['ai_bucket'] = secrets.token_urlsafe(18)
    if not allow_request(session['ai_bucket']):
        return jsonify(error='詢問過於頻繁，請稍後再試。'), 429
    key = os.environ.get('OPENAI_API_KEY', '').strip()
    if not key or key == 'your_api_key_here' or not key.startswith('sk-'):
        return offline_answer(person, question, 'missing_key')
    flags = set(progress()['challenges'])
    # 不信任瀏覽器提交的 history；只使用伺服器保存、已經過輸出過濾的近期對話。
    # 這些對話仍不等於案件事實，角色設定與劇情狀態優先。
    chat = session.get('ai_chat', {})
    previous = []
    for turn in chat.get(person, [])[-3:]:
        previous.append({'role': 'user', 'content': '[先前玩家問題，不代表事實] ' + turn['q']})
        previous.append({'role': 'assistant', 'content': turn['a']})
    unlocked = person in flags
    # Explicit meta/prompt-extraction requests do not need an expensive API call.
    instruction = build_instructions(person, unlocked)
    # The model is never the source of truth for evidence or progression.
    try:
        from openai import OpenAI
        client = OpenAI(api_key=key, timeout=20.0, max_retries=1)
        response = client.responses.create(
            model=os.environ.get('OPENAI_MODEL', 'gpt-4.1-mini'),
            instructions=instruction,
            input=previous + [{'role': 'user', 'content': question.strip()}],
            max_output_tokens=160,
            temperature=0.3,
        )
        answer = (response.output_text or '').strip()
        if suspicious_reply(person, answer, unlocked):
            app.logger.warning('AI reply rejected by character guard for %s', person)
            return jsonify(answer=safe_fallback(person, unlocked), guarded=True, mode='scripted')
        chat = session.get('ai_chat', {})
        turns = chat.get(person, [])[-2:]
        turns.append({'q': question.strip()[:150], 'a': answer[:200]})
        chat[person] = turns
        session['ai_chat'] = chat
        return jsonify(answer=answer, guarded=False, mode='ai')
    except AuthenticationError:
        app.logger.exception('OpenAI authentication failed')
        return offline_answer(person, question, 'authentication')
    except RateLimitError as exc:
        app.logger.exception('OpenAI quota or rate limit reached')
        msg = str(exc).lower()
        if 'insufficient_quota' in msg or 'quota' in msg or 'billing' in msg:
            return offline_answer(person, question, 'quota')
        return offline_answer(person, question, 'rate_limit')
    except NotFoundError:
        app.logger.exception('OpenAI model unavailable')
        return offline_answer(person, question, 'model')
    except BadRequestError:
        app.logger.exception('OpenAI rejected request')
        return offline_answer(person, question, 'bad_request')
    except (APIConnectionError, APITimeoutError):
        app.logger.exception('OpenAI network error')
        return offline_answer(person, question, 'network')
    except APIStatusError:
        app.logger.exception('OpenAI server returned an error')
        return offline_answer(person, question, 'upstream')
    except Exception:
        app.logger.exception('AI interrogation failed')
        return offline_answer(person, question, 'unknown')

if __name__ == '__main__':
    app.run(debug=os.environ.get('FLASK_DEBUG') == '1')
