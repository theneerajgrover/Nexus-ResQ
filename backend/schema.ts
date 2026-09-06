import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Users Table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.string(), // citizen | authority | rescue_team | medical_team | administrator | responder | authority_command | resource_manager
    profileInfo: v.optional(v.object({
      department: v.optional(v.string()),
      certifications: v.optional(v.array(v.string())),
      address: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
    })),
    location: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    status: v.string(), // active | offline | busy
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // 2. Disaster Events Table
  disasterEvents: defineTable({
    disasterType: v.string(), // flood | earthquake | landslide | forest_fire | cyclone | cloudburst | extreme_rainfall | heatwave | other
    title: v.string(),
    description: v.string(),
    severity: v.string(), // CRITICAL | HIGH | MODERATE | LOW
    status: v.string(), // monitoring | warning | active | contained | resolved
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    affectedArea: v.string(),
    startTime: v.number(),
    estimatedEndTime: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["disasterType"])
    .index("by_severity", ["severity"]),

  // 3. Environmental / Sensor Readings Table
  sensorReadings: defineTable({
    sensorId: v.string(),
    disasterType: v.string(),
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    rainfall: v.number(), // mm/hr
    temperature: v.number(), // Celsius
    humidity: v.number(), // %
    windSpeed: v.number(), // km/h
    riverWaterLevel: v.number(), // meters
    soilMoisture: v.number(), // %
    seismicReading: v.number(), // Richter magnitude scale equivalent
    fireIndicator: v.number(), // thermal intensity index
    weatherCondition: v.string(),
    satelliteData: v.optional(v.string()),
    populationDensity: v.number(), // people / sq km
    infrastructureStatus: v.string(),
    timestamp: v.number(),
  })
    .index("by_sensor", ["sensorId"])
    .index("by_timestamp", ["timestamp"]),

  // 4. Geographic Risk Zones Table
  riskZones: defineTable({
    zoneId: v.string(),
    name: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    boundaryPolygon: v.optional(v.array(v.object({ lat: v.number(), lng: v.number() }))),
    riskScore: v.number(), // 0 to 100
    riskLevel: v.string(), // SAFE | LOW | MODERATE | HIGH | CRITICAL
    population: v.number(),
    vulnerablePopulation: v.number(),
    disasterType: v.string(),
    currentStatus: v.string(), // monitoring | warning | evacuation_needed | active_evacuation | safe
    lastUpdatedTime: v.number(),
  })
    .index("by_zone_id", ["zoneId"])
    .index("by_risk_level", ["riskLevel"]),

  // 5. Shelter Management Table
  shelters: defineTable({
    shelterId: v.string(),
    name: v.string(),
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    capacity: v.number(),
    currentOccupancy: v.number(),
    availableCapacity: v.number(),
    facilities: v.array(v.string()), // Medical | Food | Water | Cots | Parking | etc
    medicalSupport: v.boolean(),
    accessibility: v.boolean(),
    emergencyContact: v.string(),
    status: v.string(), // available | almost_full | full | closed | OPEN | NEAR FULL | ACTIVATING
  })
    .index("by_status", ["status"])
    .index("by_shelter_id", ["shelterId"]),

  // 6. Rescue Team Management Table
  rescueTeams: defineTable({
    teamId: v.string(),
    teamName: v.string(),
    membersCount: v.number(),
    teamType: v.string(), // flood_rescue | medical | fire | search_and_rescue | evacuation | logistics
    currentLocation: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    availability: v.boolean(),
    skills: v.array(v.string()),
    equipment: v.array(v.string()),
    currentMissionId: v.optional(v.string()),
    status: v.string(), // available | deployed | busy | offline | EN ROUTE | ON SCENE | ASSISTING
  })
    .index("by_status", ["status"])
    .index("by_team_id", ["teamId"])
    .index("by_team_type", ["teamType"]),

  // 7. Resource Management Table
  resources: defineTable({
    resourceId: v.string(),
    name: v.string(),
    resourceType: v.string(), // ambulances | boats | rescue_vehicles | medical_kits | food_supplies | water | emergency_equipment | temporary_shelters | rescue_personnel
    category: v.string(), // MEDICAL | WATER | FOOD | SAFETY | EQUIPMENT
    quantity: v.number(),
    availableQuantity: v.number(),
    unit: v.string(), // kits | bottles | packs | units | sets
    location: v.string(),
    assignedZone: v.optional(v.string()),
    status: v.string(), // AVAILABLE | LIMITED | SHORTAGE | DEPLETED
    priority: v.string(), // HIGH | CRITICAL | MODERATE | LOW
    lastSync: v.string(),
  })
    .index("by_type", ["resourceType"])
    .index("by_category", ["category"])
    .index("by_status", ["status"]),

  // 8. Emergency Missions Table
  emergencyMissions: defineTable({
    missionId: v.string(),
    disasterId: v.optional(v.string()),
    incidentId: v.optional(v.string()), // INC-2849 etc.
    type: v.string(), // STRUCTURAL | FLOOD | MEDICAL | FIRE | EVACUATION
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    priority: v.string(), // P1 — CRITICAL | CRITICAL | HIGH | MODERATE | LOW
    severity: v.string(),
    description: v.string(),
    peopleAffected: v.number(),
    medicalRequirement: v.boolean(),
    requiredResources: v.array(v.string()),
    assignedTeamId: v.optional(v.string()),
    assignedTeamName: v.optional(v.string()),
    status: v.string(), // pending | assigned | accepted | in_progress | completed | cancelled | ACTIVE | RESPONDING | PENDING | CONTAINED
    pending: v.boolean(),
    respondersCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_mission_id", ["missionId"])
    .index("by_priority", ["priority"]),

  // 9. Citizen Emergency Reporting Table
  citizenReports: defineTable({
    reportId: v.string(),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    userPhone: v.optional(v.string()),
    category: v.string(), // flood | fire | road_blockage | trapped_person | medical_emergency | landslide | damaged_infrastructure | missing_person | other
    description: v.string(),
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    imageRef: v.optional(v.string()),
    severity: v.string(), // CRITICAL | HIGH | MODERATE | LOW
    status: v.string(), // submitted | verified | investigating | converted_to_mission | resolved | rejected
    timestamp: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_timestamp", ["timestamp"]),

  // 10. Alert System Table
  alerts: defineTable({
    alertId: v.string(),
    title: v.string(),
    message: v.string(),
    disasterType: v.string(),
    severity: v.string(), // CRITICAL | WARNING | INFO | HIGH | MODERATE | LOW
    affectedArea: v.string(),
    targetAudience: v.string(), // public | authority | rescue-team | shelter | mission
    location: v.string(),
    timestamp: v.number(),
    timeFormatted: v.string(),
    expirationTime: v.number(),
    status: v.string(), // active | expired | cancelled
  })
    .index("by_status", ["status"])
    .index("by_severity", ["severity"])
    .index("by_timestamp", ["timestamp"]),

  // 11. Notification System Table
  notifications: defineTable({
    recipientId: v.string(),
    notificationType: v.string(), // SMS | EMAIL | APP | CRITICAL_ALERT
    title: v.string(),
    message: v.string(),
    priority: v.string(),
    relatedDisasterId: v.optional(v.string()),
    relatedMissionId: v.optional(v.string()),
    read: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_read", ["read"]),

  // 12. Evacuation Routes Table
  evacuationRoutes: defineTable({
    routeId: v.string(), // RT-A, RT-B, RT-C
    label: v.string(),
    via: v.string(),
    origin: v.string(),
    destination: v.string(),
    waypoints: v.array(v.object({ label: v.string(), lat: v.number(), lng: v.number() })),
    distance: v.string(), // e.g. "4.2 km"
    distanceKm: v.number(),
    estimatedTime: v.string(), // e.g. "12 min by car"
    estimatedTimeMinutes: v.number(),
    safetyScore: v.number(), // 0 to 100
    riskLevel: v.string(), // LOW | MODERATE | HIGH | CRITICAL
    riskNote: v.string(),
    congestion: v.string(), // LIGHT | MODERATE | HEAVY | BLOCKED
    blockedRoads: v.array(v.string()),
    safe: v.boolean(),
    status: v.string(), // CLEAR | CONGESTED | BLOCKED | ACTIVE
    capacity: v.string(), // e.g. "4,000/hr"
    shelterTarget: v.string(),
    segments: v.array(v.object({ type: v.string(), label: v.string() })),
  })
    .index("by_route_id", ["routeId"])
    .index("by_safe", ["safe"]),

  // 13. Hospital / Medical Facility Table
  hospitals: defineTable({
    hospitalId: v.string(),
    name: v.string(),
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    emergencyCapacity: v.number(),
    availableBeds: v.number(),
    icuAvailability: v.number(),
    ambulanceAvailability: v.number(),
    medicalSpecialties: v.array(v.string()),
    emergencyStatus: v.string(), // OPERATIONAL | BUSY | OVERCAPACITY | CRITICAL
  })
    .index("by_hospital_id", ["hospitalId"])
    .index("by_status", ["emergencyStatus"]),

  // 14. Road & Infrastructure Status Table
  roadsAndInfrastructure: defineTable({
    name: v.string(),
    infrastructureType: v.string(), // road | bridge | power_station | hospital | shelter | school | communication_tower
    coordinates: v.object({ lat: v.number(), lng: v.number() }),
    status: v.string(), // safe | risky | blocked | closed
    riskLevel: v.string(),
    blockage: v.boolean(),
    blockageReason: v.optional(v.string()),
    estimatedReopeningTime: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_type", ["infrastructureType"]),

  // 15. Audit Log Table
  auditLogs: defineTable({
    actor: v.string(),
    action: v.string(), // disaster_created | risk_updated | alert_created | mission_assigned | resource_allocated | shelter_opened | team_deployed | report_verified | mission_completed
    entity: v.string(),
    timestamp: v.number(),
    timeFormatted: v.string(),
    metadata: v.optional(v.string()),
  })
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  // 16. AI Decision Support & Recommendations Table
  aiRecommendations: defineTable({
    recommendationId: v.string(),
    incidentId: v.optional(v.string()),
    priority: v.string(), // CRITICAL | HIGH | MODERATE | LOW
    action: v.string(), // evacuate | prepare_evacuation | monitor | deploy_rescue_team | deploy_ambulance | open_shelter | issue_public_warning | close_unsafe_road
    reason: v.string(),
    affectedZone: v.string(),
    estimatedPeopleAffected: v.number(),
    recommendedResource: v.string(),
    recommendedShelter: v.optional(v.string()),
    recommendedTeamsCount: v.number(),
    confidenceScore: v.number(), // e.g. 91%
    riskFlags: v.array(v.string()),
    proposedActionsList: v.array(v.string()),
    status: v.string(), // PENDING_APPROVAL | APPROVED | REJECTED | REPLANNING | COMPLETED
    timestamp: v.number(),
    approvedBy: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  // 17. Ambulances Table (Resource sub-entity for frontend compatibility)
  ambulances: defineTable({
    ambulanceId: v.string(), // AMB-14
    callsign: v.string(), // MEDIC 14
    crew: v.number(),
    status: v.string(), // AVAILABLE | DISPATCHED | RETURNING | MAINTENANCE
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    lastUpdate: v.string(),
  })
    .index("by_status", ["status"]),

  // 18. Dispatch Records Table (Authority/Command -> Resource Manager)
  dispatchRecords: defineTable({
    dispatchId: v.string(), // DSP-041
    resourceType: v.string(),
    qtyApproved: v.number(),
    qtyDispatched: v.number(),
    destination: v.string(),
    incident: v.string(),
    unit: v.string(),
    status: v.string(), // DISPATCHED | DELIVERED | PENDING
    approvedBy: v.string(),
    timestamp: v.string(),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_incident", ["incident"]),
});
