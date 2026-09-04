import os
import json
import datetime
from flask import Flask, request, jsonify, redirect
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

app = Flask(__name__)

SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']

def get_calendar_service(credentials_json_str=None, oauth_tokens=None):
    """
    Carrega o serviço do Google Calendar via Service Account ou via OAuth User Tokens.
    """
    # 1. Tenta via OAuth Tokens se fornecidos
    if oauth_tokens:
        try:
            if isinstance(oauth_tokens, str):
                token_data = json.loads(oauth_tokens)
            else:
                token_data = oauth_tokens

            creds = Credentials(
                token=token_data.get('access_token'),
                refresh_token=token_data.get('refresh_token'),
                token_uri=token_data.get('token_uri', 'https://oauth2.googleapis.com/token'),
                client_id=token_data.get('client_id'),
                client_secret=token_data.get('client_secret'),
                scopes=SCOPES
            )
            service = build('calendar', 'v3', credentials=creds)
            return service, None
        except Exception as e:
            print(f"Erro com OAuth tokens: {e}")

    # 2. Tenta via Service Account
    creds_data = credentials_json_str or os.environ.get('GOOGLE_CREDENTIALS_JSON')
    if creds_data:
        try:
            if isinstance(creds_data, str):
                info = json.loads(creds_data)
            else:
                info = creds_data

            credentials = service_account.Credentials.from_service_account_info(
                info, scopes=SCOPES
            )
            service = build('calendar', 'v3', credentials=credentials)
            return service, None
        except Exception as e:
            return None, f"Erro ao inicializar Service Account do Google Calendar: {str(e)}"

    return None, "Credenciais do Google Calendar não configuradas (defina Service Account ou faça o Vínculo OAuth)."


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "Google Calendar Python Backend (OAuth Supported)"})


@app.route('/auth/url', methods=['POST', 'GET'])
def get_auth_url():
    """
    Gera a URL de consentimento do Google OAuth 2.0 para vínculo da conta Google Agenda.
    """
    data = request.json or {}
    client_id = data.get('clientId') or os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = data.get('clientSecret') or os.environ.get('GOOGLE_CLIENT_SECRET')
    redirect_uri = data.get('redirectUri') or os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:3000/admin/configuracoes')

    if not client_id or not client_secret:
        return jsonify({
            "error": "Client ID e Client Secret do Google OAuth são necessários para gerar a URL de vínculo."
        }), 400

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }

    try:
        flow = Flow.from_client_config(client_config, scopes=SCOPES)
        flow.redirect_uri = redirect_uri
        auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline', include_granted_scopes='true')
        return jsonify({"authUrl": auth_url, "success": True})
    except Exception as e:
        return jsonify({"error": f"Erro ao gerar URL OAuth: {str(e)}"}), 500


@app.route('/auth/callback', methods=['POST'])
def oauth_callback():
    """
    Troca o código de autorização do Google OAuth pelos tokens de acesso e refresh.
    """
    data = request.json or {}
    code = data.get('code')
    client_id = data.get('clientId') or os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = data.get('clientSecret') or os.environ.get('GOOGLE_CLIENT_SECRET')
    redirect_uri = data.get('redirectUri') or os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:3000/admin/configuracoes')

    if not code:
        return jsonify({"error": "Código de autorização 'code' é obrigatório."}), 400

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }

    try:
        flow = Flow.from_client_config(client_config, scopes=SCOPES)
        flow.redirect_uri = redirect_uri
        flow.fetch_token(code=code)
        credentials = flow.credentials

        token_data = {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes
        }

        return jsonify({
            "success": True,
            "oauthTokensJson": json.dumps(token_data)
        })
    except Exception as e:
        return jsonify({"error": f"Erro ao obter tokens do Google OAuth: {str(e)}"}), 500


@app.route('/events/create', methods=['POST'])
def create_event():
    """
    Cria um evento no Google Calendar para um prazo de Atividade Domiciliar.
    """
    data = request.json or {}
    calendar_id = data.get('calendarId', 'primary')
    summary = data.get('summary', 'Lembrete de Atividade Domiciliar')
    description = data.get('description', '')
    start_date = data.get('startDate')
    end_date = data.get('endDate')
    attendees_emails = data.get('attendees', [])
    credentials_json = data.get('credentialsJson')
    oauth_tokens = data.get('oauthTokens')

    if not start_date:
        return jsonify({"error": "startDate é obrigatório"}), 400

    service, err = get_calendar_service(credentials_json, oauth_tokens)
    if err:
        return jsonify({"error": err, "mock_success": True}), 200

    start_datetime = f"{start_date}T09:00:00-03:00"
    end_datetime = f"{end_date or start_date}T17:00:00-03:00"

    event_body = {
        'summary': summary,
        'description': description,
        'start': {
            'dateTime': start_datetime,
            'timeZone': 'America/Sao_Paulo',
        },
        'end': {
            'dateTime': end_datetime,
            'timeZone': 'America/Sao_Paulo',
        },
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'email', 'minutes': 24 * 60},
                {'method': 'popup', 'minutes': 60},
            ],
        },
    }

    if attendees_emails:
        event_body['attendees'] = [{'email': email} for email in attendees_emails if email]

    try:
        event = service.events().insert(calendarId=calendar_id, body=event_body, sendUpdates='all').execute()
        return jsonify({
            "success": True,
            "eventId": event.get('id'),
            "htmlLink": event.get('htmlLink')
        })
    except Exception as e:
        return jsonify({"error": f"Erro ao criar evento no Google Calendar: {str(e)}"}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port)
