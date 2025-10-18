/**
 * Google Calendar Integration Provider
 */

export class GoogleCalendarIntegration {
  private baseURL = 'https://www.googleapis.com/calendar/v3';

  async listEvents(accessToken: string, calendarId: string = 'primary', timeMin?: Date, timeMax?: Date): Promise<any> {
    const params = new URLSearchParams({
      ...(timeMin && { timeMin: timeMin.toISOString() }),
      ...(timeMax && { timeMax: timeMax.toISOString() }),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const response = await fetch(`${this.baseURL}/calendars/${calendarId}/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.json();
  }

  async createEvent(accessToken: string, summary: string, start: Date, end: Date, description?: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      }),
    });

    return response.json();
  }
}

export const googleCalendarIntegration = new GoogleCalendarIntegration();
