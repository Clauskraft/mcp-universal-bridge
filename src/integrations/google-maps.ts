/**
 * Google Maps Integration Provider
 */

export class GoogleMapsIntegration {
  private baseURL = 'https://maps.googleapis.com/maps/api';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async geocode(address: string): Promise<any> {
    const params = new URLSearchParams({
      address,
      key: this.apiKey,
    });

    const response = await fetch(`${this.baseURL}/geocode/json?${params}`);
    return response.json();
  }

  async getDirections(origin: string, destination: string, mode: string = 'driving'): Promise<any> {
    const params = new URLSearchParams({
      origin,
      destination,
      mode,
      key: this.apiKey,
    });

    const response = await fetch(`${this.baseURL}/directions/json?${params}`);
    return response.json();
  }

  async searchPlaces(query: string, location?: string): Promise<any> {
    const params = new URLSearchParams({
      query,
      ...(location && { location }),
      key: this.apiKey,
    });

    const response = await fetch(`${this.baseURL}/place/textsearch/json?${params}`);
    return response.json();
  }
}
