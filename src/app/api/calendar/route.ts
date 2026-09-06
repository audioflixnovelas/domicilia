import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';

const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];

function getCalendarClient(credentialsJson?: string, oauthTokensJson?: string) {
  // 1. Tenta OAuth Tokens do usuário
  const tokenDataStr = oauthTokensJson || process.env.GOOGLE_OAUTH_TOKENS_JSON;
  if (tokenDataStr) {
    try {
      const tokenData = typeof tokenDataStr === 'string' ? JSON.parse(tokenDataStr) : tokenDataStr;
      const oauth2Client = new google.auth.OAuth2(
        tokenData.client_id || process.env.GOOGLE_CLIENT_ID,
        tokenData.client_secret || process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      });
      return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (e) {
      console.warn('Erro ao carregar OAuth tokens:', e);
    }
  }

  // 2. Tenta Service Account
  const serviceAccountJsonStr = credentialsJson || process.env.GOOGLE_CREDENTIALS_JSON;
  if (serviceAccountJsonStr) {
    try {
      const info = typeof serviceAccountJsonStr === 'string' ? JSON.parse(serviceAccountJsonStr) : serviceAccountJsonStr;
      const auth = new google.auth.JWT({
        email: info.client_email,
        key: info.private_key,
        scopes: SCOPES,
      });
      return google.calendar({ version: 'v3', auth });
    } catch (e) {
      console.warn('Erro ao carregar Service Account:', e);
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, clientId, clientSecret, redirectUri, code, calendarId, summary, description, startDate, endDate, attendees, credentialsJson, oauthTokens } = body;

    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:5001';

    // Tenta primeiro via backend Python
    if (action === 'get_auth_url') {
      try {
        const pyRes = await fetch(`${pythonBackendUrl}/auth/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, clientSecret, redirectUri }),
        });
        if (pyRes.ok) {
          const pyData = await pyRes.json();
          return NextResponse.json(pyData);
        }
      } catch {
        // Fallback Node
      }

      const cId = clientId || process.env.GOOGLE_CLIENT_ID;
      const cSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET;

      if (!cId || !cSecret) {
        return NextResponse.json(
          { error: 'Client ID e Client Secret do Google OAuth são necessários.' },
          { status: 400 }
        );
      }

      const oauth2Client = new google.auth.OAuth2(cId, cSecret, redirectUri);
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
      });

      return NextResponse.json({ success: true, authUrl });
    }

    // Callback do OAuth (trocar código por tokens)
    if (action === 'callback') {
      try {
        const pyRes = await fetch(`${pythonBackendUrl}/auth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, clientId, clientSecret, redirectUri }),
        });
        if (pyRes.ok) {
          const pyData = await pyRes.json();
          return NextResponse.json(pyData);
        }
      } catch {
        // Fallback Node
      }

      const cId = clientId || process.env.GOOGLE_CLIENT_ID;
      const cSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET;

      if (!code) {
        return NextResponse.json({ error: 'Código de autorização ausente.' }, { status: 400 });
      }

      if (!cId || !cSecret) {
        return NextResponse.json({
          error: 'Credenciais do Google (Client ID / Client Secret) não configuradas. Acesse Admin -> Configurações para preenchê-las.',
        }, { status: 400 });
      }

      try {
        const oauth2Client = new google.auth.OAuth2(cId, cSecret, redirectUri);
        const { tokens } = await oauth2Client.getToken(code);

        const oauthTokensJson = JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          client_id: cId,
          client_secret: cSecret,
        });

        return NextResponse.json({ success: true, oauthTokensJson });
      } catch (err: any) {
        const errStr = String(err?.message || err?.response?.data?.error || err);
        if (errStr.includes('invalid_client')) {
          return NextResponse.json({
            error: 'Credenciais do Google incorretas (invalid_client). Verifique se o Client ID e o Client Secret informados nas Configurações do Sistema são válidos e foram criados no Google Cloud Console.',
          }, { status: 400 });
        }
        return NextResponse.json({
          error: `Erro ao obter autorização do Google: ${errStr}`,
        }, { status: 500 });
      }
    }

    // Criar evento no Google Agenda
    try {
      const pyRes = await fetch(`${pythonBackendUrl}/events/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId, summary, description, startDate, endDate, attendees, credentialsJson, oauthTokens }),
      });
      if (pyRes.ok) {
        const pyData = await pyRes.json();
        return NextResponse.json(pyData);
      }
    } catch {
      // Fallback Node
    }

    const calendar = getCalendarClient(credentialsJson, oauthTokens);

    if (!calendar) {
      return NextResponse.json({
        success: true,
        mock_success: true,
        message: 'Google Calendar não configurado, evento mantido no sistema.',
      });
    }

    const startDateTime = `${startDate || new Date().toISOString().split('T')[0]}T09:00:00-03:00`;
    const endDateTime = `${endDate || startDate || new Date().toISOString().split('T')[0]}T17:00:00-03:00`;

    const eventBody: any = {
      summary: summary || 'Lembrete de Atividade Domiciliar',
      description: description || '',
      start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    };

    if (Array.isArray(attendees) && attendees.length > 0) {
      eventBody.attendees = attendees.filter(Boolean).map((email: string) => ({ email }));
    }

    const res = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      requestBody: eventBody,
      sendUpdates: 'all',
    });

    return NextResponse.json({
      success: true,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
    });
  } catch (error: any) {
    console.error('Erro na API do Google Calendar:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar requisição no Google Calendar' }, { status: 500 });
  }
}
