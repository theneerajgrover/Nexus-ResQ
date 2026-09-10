// ============================================================
// NEXUS RESQ — TYPED FRONTEND API SERVICES
// ============================================================
import { apiClient } from './client';

// ── Auth Service ─────────────────────────────────────────────
export const authApi = {
  login: (role: string, email?: string, password?: string) =>
    apiClient.post('/auth/login', { role, email, password }),
  signup: (data: { name: string; email: string; password?: string; confirmPassword?: string; phone?: string; location?: string }) =>
    apiClient.post('/auth/signup', data),
  logout: () =>
    apiClient.post('/auth/logout'),
  applyResponder: (data: { fullName: string; email: string; organization: string; certId: string; phone: string }) =>
    apiClient.post('/auth/responder-apply', data),
  getMe: (role?: string) =>
    apiClient.get(`/auth/me${role ? `?role=${role}` : ''}`),
  updateProfile: (data: { name?: string; phone?: string; phone_number?: string }) =>
    apiClient.put('/users/me', data),
};

// ── Weather & Location Services ──────────────────────────────
export const weatherApi = {
  getCurrent: (lat: number, lon: number) =>
    apiClient.get(`/weather/current?lat=${lat}&lon=${lon}`),
  searchLocations: (query: string) =>
    apiClient.get(`/weather/search?query=${encodeURIComponent(query)}`),
  searchLocation: (query: string) =>
    apiClient.get(`/weather/location-search?q=${encodeURIComponent(query)}`),
};

export const locationApi = {
  reverseGeocode: (lat: number, lon: number, accuracy?: number | null) =>
    apiClient.post('/location/reverse-geocode', { latitude: lat, longitude: lon, accuracy }),
  autocomplete: (input: string) =>
    apiClient.get(`/location/autocomplete?input=${encodeURIComponent(input)}`),
  getPlaceDetails: (placeId: string) =>
    apiClient.post('/location/place-details', { placeId }),
  validateAddress: (address: string) =>
    apiClient.post('/location/validate', { address }),
};

// ── Incidents Service ────────────────────────────────────────
export const incidentsApi = {
  getAll: () => apiClient.get('/incidents'),
  getById: (id: string) => apiClient.get(`/incidents/${id}`),
  getHistory: (id: string) => apiClient.get(`/incidents/${id}/history`),
  getReports: (id: string) => apiClient.get(`/incidents/${id}/reports`),
  getAgentResults: (id: string) => apiClient.get(`/incidents/${id}/agent-results`),
  report: (data: {
    disaster_type: string;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
    severity?: string;
    description?: string;
    affected_people?: number;
    source?: string;
    reporter_name?: string;
    reporter_phone?: string;
    media_url?: string;
  }) => apiClient.post('/incidents/report', data),
  create: (data: any) => apiClient.post('/incidents', data),
  update: (id: string, data: any) => apiClient.patch(`/incidents/${id}`, data),
};

// ── Emergency & SOS Service ──────────────────────────────────
export const emergencyApi = {
  submitRequest: (data: {
    emergencyType?: string;
    emergency_type?: string;
    assistance?: string[];
    assistance_needed?: string[];
    location?: string;
    location_name?: string;
    formatted_address?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    device_latitude?: number;
    device_longitude?: number;
    device_accuracy_meters?: number;
    device_location_timestamp?: string;
    incident_latitude?: number;
    incident_longitude?: number;
    incident_accuracy_meters?: number;
    place_id?: string | null;
    village?: string | null;
    locality?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    location_source?: string;
    location_verified?: boolean;
    location_confidence?: number;
    details?: string;
    description?: string;
    name?: string;
    contact_name?: string;
    phone?: string;
    contact_phone?: string;
  }) => apiClient.post('/emergency/request', data),
  getRequests: () => apiClient.get('/emergency/requests'),
  getRequestStatus: (id: string) => apiClient.get(`/emergency/requests/${id}`),
  getHistory: (userId?: string) => apiClient.get(`/emergency/history${userId ? `?user_id=${userId}` : ''}`),
};

// ── Shelters Service ─────────────────────────────────────────
export const sheltersApi = {
  getAll: () => apiClient.get('/shelters'),
  create: (data: { name: string; capacity: number; occupancy?: number; status?: string; address?: string; accessible?: boolean; facilities?: string[] }) =>
    apiClient.post('/shelters', data),
  updateStatus: (id: string, data: { occupancy?: number; capacity?: number; status?: string }) =>
    apiClient.patch(`/shelters/${id}`, data),
};

// ── Evacuation Routes Service ────────────────────────────────
export const routesApi = {
  getAll: () => apiClient.get('/evacuation-routes'),
  calculate: (data: { originLat: number; originLng: number; destinationLat: number; destinationLng: number; incidentId?: string }) =>
    apiClient.post('/evacuation-routes/calculate', data),
  getActive: (incidentId: string) => apiClient.get(`/evacuation-routes/active/${incidentId}`),
};

// ── Alerts & Warnings Service ────────────────────────────────
export const alertsApi = {
  getActive: () => apiClient.get('/alerts'),
  create: (data: any) => apiClient.post('/alerts', data),
  deactivate: (id: string) => apiClient.patch(`/alerts/${id}/deactivate`),
};

// ── Responders & Missions Service ────────────────────────────
export const respondersApi = {
  getAll: () => apiClient.get('/responders'),
  getAssignedMission: () => apiClient.get('/responders/mission'),
  getHistory: (responderId?: string) =>
    apiClient.get(`/responders/history${responderId ? `?responder_id=${responderId}` : ''}`),
  createResponder: (data: { name: string; callsign?: string; status?: string; latitude?: number; longitude?: number }) =>
    apiClient.post('/responders', data),
  updateResponderStatus: (id: string, status: string, currentIncidentId?: string | null) =>
    apiClient.patch(`/responders/${id}`, { status, current_incident_id: currentIncidentId }),
  updateMissionStatus: (id: string, payload: string | { status: string; [key: string]: any }) => {
    const data = typeof payload === 'string' ? { status: payload } : payload;
    return apiClient.patch(`/responders/mission/${id}/status`, data);
  },
};

// ── Resources Service ────────────────────────────────────────
export const resourcesApi = {
  getOverview: () => apiClient.get('/resources/overview'),
  getSupplies: () => apiClient.get('/resources/supplies'),
  getAmbulances: () => apiClient.get('/resources/ambulances'),
  getEquipment: () => apiClient.get('/resources/equipment'),
  getDispatches: () => apiClient.get('/resources/dispatches'),
  createDispatch: (data: any) => apiClient.post('/resources/dispatches', data),
  createSupply: (data: { name: string; category: string; qty: number; demand?: number; unit: string; location: string }) =>
    apiClient.post('/resources/supplies', data),
  updateSupply: (id: string, data: { qty?: number; demand?: number; location?: string }) =>
    apiClient.patch(`/resources/supplies/${id}`, data),
  createAmbulance: (data: { callsign: string; crew?: number; status?: string; location: string }) =>
    apiClient.post('/resources/ambulances', data),
  createEquipment: (data: { name: string; qty: number; available?: number; location: string }) =>
    apiClient.post('/resources/equipment', data),
  updateEquipment: (id: string, data: { qty?: number; location?: string }) =>
    apiClient.patch(`/resources/equipment/${id}`, data),
  createResponder: (data: { name: string; callsign?: string; status?: string; latitude?: number; longitude?: number }) =>
    apiClient.post('/resources/responders', data),
  getEmergencyStatus: () => apiClient.get('/resources/emergency-status'),
  declareEmergency: (data: {
    location: string;
    emergencyType: string;
    severity: string;
    description: string;
    requestedResourceType?: string;
    requestedQuantity?: number;
    reservedLocalQuantity?: number;
    managerId?: string;
  }) => apiClient.post('/resources/declare-emergency', data),
  restoreOperationalStatus: (data?: { emergencyId?: string; location?: string; restoredBy?: string; notes?: string }) =>
    apiClient.post('/resources/restore-status', data || {}),
};

// ── Command Center Service ───────────────────────────────────
export const commandApi = {
  getOverview: () => apiClient.get('/command/overview'),
  getRegions: () => apiClient.get('/command/regions'),
  getAgents: () => apiClient.get('/command/agents'),
  getRecommendations: () => apiClient.get('/command/recommendations'),
  takeRecommendationAction: (id: string, action: 'APPROVE' | 'REJECT' | 'ALLOW' | 'DENY', approvedBy?: string, comments?: string) =>
    apiClient.post(`/command/recommendations/${id}/action`, { action, approvedBy, comments }),
  dismissRecommendation: (id: string, note?: string) =>
    apiClient.post(`/command/recommendations/${id}/dismiss`, { note }),
};

// ── Group A: Predictive Intelligence Service ─────────────────
export const predictiveApi = {
  getOverview: () => apiClient.get('/command/predictive/overview'),
  runAll: () => apiClient.post('/command/predictive/run'),
  runAgent: (agentId: string) => apiClient.post(`/command/predictive/run/${agentId}`),
  takeRecommendationAction: (id: string, action: 'APPROVE' | 'REJECT' | 'ALLOW' | 'DENY', approvedBy?: string, comments?: string) =>
    apiClient.post(`/command/predictive/recommendations/${id}/action`, { action, approvedBy, comments }),
};

// ── Human Approvals Service ──────────────────────────────────
export const approvalsApi = {
  getPending: () => apiClient.get('/approvals/pending'),
  approve: (id: string) => apiClient.post(`/approvals/${id}/approve`, {}),
  reject: (id: string, reason: string) => apiClient.post(`/approvals/${id}/reject`, { reason }),
  dismiss: (id: string, reason?: string) => apiClient.post(`/approvals/${id}/dismiss`, { reason }),
};

// ── Notifications Service ────────────────────────────────────
export const notificationsApi = {
  getAll: (limit = 25) => apiClient.get(`/notifications?limit=${limit}`),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`, {}),
};

// ── AI Orchestrator Service ──────────────────────────────────
export const orchestratorApi = {
  run: (incidentId?: string) => apiClient.post('/orchestrator/run', { incidentId }),
  getStatus: () => apiClient.get('/orchestrator/status'),
  getExecutions: (incidentId?: string) => apiClient.get(`/orchestrator/executions${incidentId ? `?incidentId=${incidentId}` : ''}`),
};

// ── Live Tracking & Operational Lifecycle Service ───────────
export const trackingApi = {
  sendLocation: (data: {
    entityType: 'responder' | 'citizen' | 'ambulance' | 'vehicle';
    entityId: string;
    incidentId?: string;
    requestId?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  }) => apiClient.post('/tracking/location', data),

  updateStatus: (data: {
    incidentId?: string;
    requestId?: string;
    responderId?: string;
    status: string;
    actor: string;
    notes?: string;
  }) => apiClient.post('/tracking/status', data),

  getTracking: (incidentId: string) => apiClient.get(`/tracking/${incidentId}`),
  getTrackingByRequest: (requestId: string) => apiClient.get(`/tracking/request/${requestId}`),
  getLocation: (entityType: string, entityId: string) => apiClient.get(`/tracking/location/${entityType}/${entityId}`),
  triggerReroute: (incidentId: string, originLat?: number, originLng?: number) =>
    apiClient.post(`/tracking/reroute/${incidentId}`, { originLat, originLng }),
};



