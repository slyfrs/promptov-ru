# backend/generate_test_data.py
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models.user import db, User
from models.prompt import Prompt, Tag, Rating
from datetime import datetime, timedelta
import random
from werkzeug.security import generate_password_hash
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def cleanup_all():
    """Полная очистка всех таблиц"""
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SET session_replication_role = 'replica'")
    cur.execute("TRUNCATE TABLE prompt_tags RESTART IDENTITY CASCADE")
    cur.execute("TRUNCATE TABLE ratings RESTART IDENTITY CASCADE")
    cur.execute("TRUNCATE TABLE comments RESTART IDENTITY CASCADE")
    cur.execute("TRUNCATE TABLE notifications RESTART IDENTITY CASCADE")
    cur.execute("TRUNCATE TABLE prompts RESTART IDENTITY CASCADE")
    cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE")
    cur.execute("TRUNCATE TABLE tags RESTART IDENTITY CASCADE")
    cur.execute("SET session_replication_role = 'origin'")

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Все таблицы очищены")


def get_db_connection():
    """Получить подключение к БД для прямых SQL запросов"""
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def create_tags_sql():
    """Создание тэгов через SQL с поддержкой name_ru/name_en"""
    print("📝 Создаём тэги категорий и нейросетей...")

    tags_data = [
        # Категории
        {"name_ru": "Копирайтинг", "name_en": "Copywriting", "type": "category", "icon": "PenTool"},
        {"name_ru": "Программирование", "name_en": "Programming", "type": "category", "icon": "Code2"},
        {"name_ru": "Дизайн", "name_en": "Design", "type": "category", "icon": "Palette"},
        {"name_ru": "Маркетинг", "name_en": "Marketing", "type": "category", "icon": "Megaphone"},
        {"name_ru": "Образование", "name_en": "Education", "type": "category", "icon": "Layers"},
        {"name_ru": "Творчество", "name_en": "Creativity", "type": "category", "icon": "Lightbulb"},
        {"name_ru": "Аналитика", "name_en": "Analytics", "type": "category", "icon": "Target"},
        {"name_ru": "Перевод", "name_en": "Translation", "type": "category", "icon": "FileText"},
        {"name_ru": "HR и Резюме", "name_en": "HR & Resume", "type": "category", "icon": "Target"},
        {"name_ru": "Развлечения", "name_en": "Entertainment", "type": "category", "icon": "Star"},
        
        # Нейросети
        {"name_ru": "ChatGPT", "name_en": "ChatGPT", "type": "ai_model", "icon": "Sparkles"},
        {"name_ru": "Яндекс GPT", "name_en": "Yandex GPT", "type": "ai_model", "icon": "Container"},
        {"name_ru": "DeepSeek", "name_en": "DeepSeek", "type": "ai_model", "icon": "Container"},
        {"name_ru": "Claude", "name_en": "Claude", "type": "ai_model", "icon": "Brain"},
        {"name_ru": "Midjourney", "name_en": "Midjourney", "type": "ai_model", "icon": "Zap"},
        {"name_ru": "DALL-E", "name_en": "DALL-E", "type": "ai_model", "icon": "Globe"},
        {"name_ru": "Kandinsky", "name_en": "Kandinsky", "type": "ai_model", "icon": "Eye"},
        {"name_ru": "Stable Diffusion", "name_en": "Stable Diffusion", "type": "ai_model", "icon": "Database"},
        {"name_ru": "Gemini", "name_en": "Gemini", "type": "ai_model", "icon": "Network"},
        {"name_ru": "Copilot", "name_en": "Copilot", "type": "ai_model", "icon": "Server"},
        {"name_ru": "GigaChat", "name_en": "GigaChat", "type": "ai_model", "icon": "Box"},
        {"name_ru": "LLaMA", "name_en": "LLaMA", "type": "ai_model", "icon": "Box"},
        {"name_ru": "Mistral AI", "name_en": "Mistral AI", "type": "ai_model", "icon": "Code2"},
    ]

    conn = get_db_connection()
    cur = conn.cursor()
    
    for tag_data in tags_data:
        # Проверяем, существует ли уже
        cur.execute("SELECT id FROM tags WHERE name_ru = %s", (tag_data["name_ru"],))
        if cur.fetchone():
            print(f"  ⏩ Тег {tag_data['name_ru']} уже существует")
            continue
            
        cur.execute(
            """
            INSERT INTO tags (name_ru, name_en, type, icon)
            VALUES (%s, %s, %s, %s)
            """,
            (tag_data["name_ru"], tag_data["name_en"], tag_data["type"], tag_data["icon"])
        )
        print(f"  ✅ Добавлен тег: {tag_data['name_ru']} / {tag_data['name_en']}")

    conn.commit()
    cur.close()
    conn.close()
    print("🎉 Все теги добавлены!\n")


def create_users_sql():
    """Создание пользователей через SQL"""
    print("📝 Создаём тестовых пользователей...")

    users_data = [
        ("admin@promptov.ru", "admin", "admin", 10, "Москва", "Администратор платформы", True),
        ("alex@example.com", "alex_creator", "user", 10, "Москва", "Люблю создавать промпты для ChatGPT и Midjourney", True),
        ("marina@example.com", "marina_ai", "user", 25, "Санкт-Петербург", "AI-энтузиаст, тестирую нейросети", True),
        ("ivan@example.com", "ivan_prompter", "user", 5, "Новосибирск", "Программист, пишу промпты для кода", True),
        ("elena@example.com", "elena_design", "user", 30, "Екатеринбург", "Дизайнер, создаю промпты для Midjourney", True),
        ("dmitry@example.com", "dmitry_marketing", "user", 15, "Казань", "Маркетолог, использую AI для контента", True),
        ("olga@example.com", "olga_teacher", "user", 20, "Нижний Новгород", "Преподаватель, помогаю студентам с AI", True),
        ("sergey@example.com", "sergey_dev", "user", 8, "Самара", "Full-stack разработчик", True),
        ("anna@example.com", "anna_creative", "user", 12, "Ростов-на-Дону", "Креативный директор", True),
        ("pavel@example.com", "pavel_analyst", "user", 3, "Уфа", "Аналитик данных", True),
        ("tatyana@example.com", "tatyana_writer", "user", 18, "Красноярск", "Копирайтер", True),
        ("andrey@example.com", "andrey_business", "user", 7, "Воронеж", "Предприниматель", True),
        ("natalia@example.com", "natalia_hr", "user", 6, "Волгоград", "HR-директор", True),
        ("maxim@example.com", "maxim_gamer", "user", 4, "Пермь", "Геймдизайнер", True),
        ("irina@example.com", "irina_art", "user", 22, "Сочи", "Художник", True),
    ]

    conn = get_db_connection()
    cur = conn.cursor()

    created_count = 0
    for email, username, role, trust_score, city, bio, email_confirmed in users_data:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            print(f"  ⏩ Пользователь {username} уже существует")
            continue

        password_hash = generate_password_hash("test123")
        created_at = datetime.utcnow() - timedelta(days=random.randint(1, 365))

        cur.execute(
            """
            INSERT INTO users (email, username, password_hash, role, trust_score, is_blocked, 
                               city, bio, created_at, email_confirmed, email_confirmation_token)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (email, username, password_hash, role, trust_score, False, city, bio, created_at, email_confirmed, None),
        )

        user_id = cur.fetchone()[0]
        created_count += 1
        print(f"  ✅ Создан: {username} ({email}), id={user_id}")

    conn.commit()
    cur.close()
    conn.close()

    print(f"✅ Всего создано пользователей: {created_count}\n")
    return created_count


def get_user_ids():
    """Получить ID всех пользователей (кроме админа)"""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE role = 'user' ORDER BY id")
    user_ids = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return user_ids


def get_tag_ids():
    """Получить ID и названия нейросетей"""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name_ru FROM tags WHERE type = 'ai_model'")
    tags = [(row[0], row[1]) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return tags


def get_cat_ids():
    """Получить ID и названия категорий"""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name_ru FROM tags WHERE type = 'category'")
    tags = [(row[0], row[1]) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return tags


def generate_prompts_sql():
    """Генерация промптов через SQL с использованием theme_id"""
    print("📝 Создаём тестовые промпты...")

    user_ids = get_user_ids()
    if not user_ids:
        print("❌ Нет пользователей! Сначала запустите создание пользователей.")
        return 0, {}

    tag_ids = get_tag_ids()
    if not tag_ids:
        print("❌ Нет тегов-нейросетей! Сначала добавьте их через админку.")
        return 0, {}

    cat_ids = get_cat_ids()
    if not cat_ids:
        print("❌ Нет категорий! Сначала добавьте категории.")
        return 0, {}

    titles_by_cat = {
        "Копирайтинг": ["Написание продающего поста", "SEO-описание товара", "Заголовок для статьи", "Email-рассылка", "Пост для Telegram"],
        "Программирование": ["React компонент", "Оптимизация SQL", "Скрипт парсинга", "Dockerfile", "REST API"],
        "Дизайн": ["Портрет в Midjourney", "Логотип", "Пейзаж", "UI дизайн", "Сетка для веб-дизайна"],
        "Маркетинг": ["Стратегия продвижения", "Анализ конкурентов", "План лидогенерации", "SEO стратегия", "Рекламная кампания"],
        "Образование": ["План урока", "Объяснение сложной темы", "Тестовые вопросы", "Краткое содержание книги", "Структура курса"],
        "Аналитика": ["Анализ данных в Excel", "Визуализация Python", "Метрики дашборда", "Прогнозирование продаж", "A/B тестирование"],
        "Перевод": ["Технический перевод", "Локализация интерфейса", "Перевод статьи", "Субтитры к видео", "Адаптация контента"],
        "HR и Резюме": ["Сопроводительное письмо", "Структура резюме", "Вопросы собеседования", "Ассессмент", "План развития"],
        "Развлечения": ["Генерация шуток", "Идеи для игры", "Стихи", "Текст песни", "Сценарий короткометражки"],
    }

    conn = get_db_connection()
    cur = conn.cursor()

    total_prompts = 0
    prompt_ids_by_user = {}

    for user_id in user_ids:
        cur.execute("SELECT username FROM users WHERE id = %s", (user_id,))
        username = cur.fetchone()[0]

        num_prompts = random.randint(7, 12)
        user_prompts = []

        for _ in range(num_prompts):
            # Выбираем случайную категорию
            cat_id, cat_name = random.choice(cat_ids)
            
            title_prefix = random.choice(titles_by_cat.get(cat_name, ["Обычный промпт"]))
            title = f"{title_prefix} (от {username})"

            # Генерация контента
            content = f"Ты — эксперт в области {cat_name}. Создай {title_prefix.lower()} с учётом лучших практик. Используй: конкретные инструкции, примеры, форматирование."

            description = f"{title_prefix.lower()} — качественный промпт для {cat_name} с примерами и рекомендациями."
            status = "published"
            created_at = datetime.utcnow() - timedelta(days=random.randint(1, 180))
            published_at = datetime.utcnow() - timedelta(days=random.randint(0, 90))
            ratings_count = random.randint(0, 50)

            cur.execute(
                """
                INSERT INTO prompts (user_id, title, content, description, status, theme_id, created_at, published_at, ratings_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (user_id, title, content, description, status, cat_id, created_at, published_at, ratings_count),
            )

            prompt_id = cur.fetchone()[0]
            user_prompts.append(prompt_id)

            # Добавляем теги (1-3 случайных нейросети)
            num_tags = random.randint(1, 3)
            selected_tags = random.sample(tag_ids, min(num_tags, len(tag_ids)))
            for tag_id, _ in selected_tags:
                cur.execute(
                    """
                    INSERT INTO prompt_tags (prompt_id, tag_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (prompt_id, tag_id),
                )

            total_prompts += 1

        prompt_ids_by_user[user_id] = user_prompts
        print(f"  ✅ {username}: создано {len(user_prompts)} промптов")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n✅ Всего создано {total_prompts} промптов")
    return total_prompts, prompt_ids_by_user


def generate_random_ratings_sql(prompt_ids_by_user):
    """Генерация случайных лайков через SQL"""
    print("\n📝 Генерируем случайные лайки...")

    user_ids = list(prompt_ids_by_user.keys())
    all_prompt_ids = []
    for prompts in prompt_ids_by_user.values():
        all_prompt_ids.extend(prompts)

    if not all_prompt_ids:
        print("❌ Нет промптов для лайков")
        return 0

    conn = get_db_connection()
    cur = conn.cursor()

    likes_count = 0

    for user_id in user_ids:
        cur.execute(
            """
            SELECT id FROM prompts 
            WHERE user_id != %s AND id NOT IN (
                SELECT prompt_id FROM ratings WHERE user_id = %s
            )
            """,
            (user_id, user_id),
        )

        available_prompts = [row[0] for row in cur.fetchall()]

        if not available_prompts:
            continue

        num_likes = random.randint(len(available_prompts) // 5, len(available_prompts) // 3)
        liked_prompts = random.sample(available_prompts, min(num_likes, len(available_prompts)))

        for prompt_id in liked_prompts:
            created_at = datetime.utcnow() - timedelta(days=random.randint(0, 60))
            cur.execute(
                """
                INSERT INTO ratings (user_id, prompt_id, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, prompt_id) DO NOTHING
                """,
                (user_id, prompt_id, created_at),
            )

            if cur.rowcount > 0:
                likes_count += 1
                cur.execute("UPDATE prompts SET ratings_count = ratings_count + 1 WHERE id = %s", (prompt_id,))

        cur.execute("SELECT username FROM users WHERE id = %s", (user_id,))
        username = cur.fetchone()[0]
        print(f"  ✅ {username}: поставил {len(liked_prompts)} лайков")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n✅ Всего создано {likes_count} лайков")
    return likes_count

def generate_about_page():
    """Generate about-page"""
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""INSERT INTO pages (slug, title, content, updated_at) 
                   VALUES ('about', 'О проекте', '<h1>О проекте Promptov.ru</h1><p>Платформа для обмена и оценки промптов для нейросетей.</p>',
                   NOW());""")

    conn.commit()
    cur.close()
    conn.close()
    print("✅About page is created!")

def run():
    """Главная функция"""
    print("\n" + "=" * 60)
    print("🚀 ГЕНЕРАЦИЯ ТЕСТОВЫХ ДАННЫХ")
    print("=" * 60 + "\n")

    cleanup_all()
    create_tags_sql()
    create_users_sql()
    generate_about_page()

    # Проверяем наличие данных
    cat_ids = get_cat_ids()
    tag_ids = get_tag_ids()
    user_ids = get_user_ids()

    print(f"📋 Найдено категорий: {len(cat_ids)}")
    print(f"📋 Найдено нейросетей: {len(tag_ids)}")
    print(f"👥 Найдено пользователей: {len(user_ids)}\n")

    if not cat_ids or not tag_ids or not user_ids:
        print("❌ Не хватает данных для генерации промптов!")
        return

    # Генерируем промпты и лайки
    total_prompts, prompt_ids_by_user = generate_prompts_sql()
    total_likes = generate_random_ratings_sql(prompt_ids_by_user)

    print("\n" + "=" * 60)
    print("🎉 ГОТОВО!")
    print("=" * 60)
    print(f"📊 Итоговая статистика:")
    print(f"   👥 Пользователей: {len(user_ids)}")
    print(f"   📝 Новых промптов: {total_prompts}")
    print(f"   ❤️ Новых лайков: {total_likes}")
    print("\n🔑 Пароль для всех тестовых пользователей: test123")
    print("📧 Email для входа: admin@promptov.ru или любой другой из списка выше")


if __name__ == "__main__":
    with app.app_context():
        run()
