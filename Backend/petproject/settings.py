import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-w2mv)*v#^x=%49k-wse2lq8#&0&y1i0k9ihwef*fpls39h7%b!'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*'] if DEBUG else [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '10.0.2.2',
    'testserver',
]


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'petapp',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'petproject.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'petproject.wsgi.application'


# Database
# Default to SQLite for local development so the app works out of the box.
# If a PostgreSQL connection is explicitly configured via environment variables,
# it will be used instead.

def _get_database_config():
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'pet'),
            'USER': os.getenv('POSTGRES_USER', 'pet_user'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', '123456'),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
        }

    if os.getenv('POSTGRES_DB') or os.getenv('POSTGRES_USER'):
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'pet'),
            'USER': os.getenv('POSTGRES_USER', 'pet_user'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', '123456'),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
        }

    return {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }


DATABASES = {
    'default': _get_database_config(),
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

AUTH_USER_MODEL = 'petapp.CustomUser'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SIMPLE_JWT = {
    'AUTH_HEADER_TYPES': ('Bearer',),
}

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]

    # Allow local Vite/dev servers even when the port shifts from 5173 to 5174+.
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r'^http://localhost:\d+$',
        r'^http://127\.0\.0\.1:\d+$',
    ]


# Used by petapp.visualization_service to composite pets into a room photo via
# Gemini's image generation model, and by petapp.soni_ai for Soni's real
# conversational replies (same key, different Gemini model). Leave unset to
# disable both features.
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
GEMINI_IMAGE_MODEL = os.getenv('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image').strip()
GEMINI_TEXT_MODEL = os.getenv('GEMINI_TEXT_MODEL', 'gemini-2.5-flash').strip()

# Used by petapp.vet_service to look up nearby veterinary clinics via the
# Google Places API. Leave unset to disable the vets feature.
GOOGLE_PLACES_API_KEY = os.getenv('GOOGLE_PLACES_API_KEY', '').strip()

# Used by petapp.tts_service for Soni's voice via Google Cloud Text-to-Speech.
# Falls back to GOOGLE_PLACES_API_KEY if unset, since one Google Cloud API key
# can be enabled for multiple APIs. Leave both unset to disable cloud voice.
GOOGLE_CLOUD_TTS_API_KEY = os.getenv('GOOGLE_CLOUD_TTS_API_KEY', '').strip()

GOOGLE_OAUTH_CLIENT_IDS = tuple(
    client_id
    for client_id in {
        os.getenv('GOOGLE_CLIENT_ID', '').strip(),
        os.getenv('GOOGLE_WEB_CLIENT_ID', '').strip(),
        os.getenv('GOOGLE_ANDROID_CLIENT_ID', '').strip(),
        os.getenv('GOOGLE_IOS_CLIENT_ID', '').strip(),
        os.getenv('GOOGLE_EXPO_CLIENT_ID', '').strip(),
    }
    if client_id
)

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
