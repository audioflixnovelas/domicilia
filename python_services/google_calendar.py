import os
import json
import datetime
from flask import Flask, request, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)

SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_calendar_service(credentials_json_str=None):
    """
    Carrega as credenciais da Service Account do Google Calendar.
    Pode vir de uma variável de ambiente GOOGLE_CREDENTIALS_JSON ou string passada.
    """
    creds_data = credentials_json_str or os.environ.get('GOOGLE_CREDENTIALS_JSON')
    if not creds_data:
        return None, "Credenciais do Google Calendar não configuradas."

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
        return None, f"Erro ao inicializar serviço do Google Calendar: {str(e)}"


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "Google Calendar Python Backend"})


@app.route('/events/create', methods=['POST'])
def create_event():
    """
    Cria um evento no Google Calendar para um prazo de Atividade Domiciliar.
    Payload esperado:
    {
      "calendarId": "primary" ou id do calendário,
      "summary": "Atividade Domiciliar - Aluno X - Matemática",
      "description": "Atividade Domiciliar para o aluno X (Turma Y).",
      "startDate": "2026-03-01",
      "endDate": "2026-03-07",
      "attendees": ["professor@exemplo.com"],
      "credentialsJson": "{...}" (opcional se configurado na env)
    }
    """
    data = request.json or {}
    calendar_id = data.get('calendarId', 'primary')
    summary = data.get('summary', 'Lembrete de Atividade Domiciliar')
    description = data.get('description', '')
    start_date = data.get('startDate')
    end_date = data.get('endDate')
    attendees_emails = data.get('attendees', [])
    credentials_json = data.get('credentialsJson')

    if not start_date:
        return jsonify({"error": "startDate é obrigatório"}), 400

    service, err = get_calendar_service(credentials_json)
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
