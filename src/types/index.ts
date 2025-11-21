export interface Station {
  stationId: string
}

export interface StationListResponse {
  stations: Station[]
  totalCount: number
}

export interface PowerData {
  deviceTime: string
  gridPower: number
}

export interface PowerDataResponse {
  stationId: string
  data: PowerData[]
}

export interface ChartPoint {
  time: number
  value: number
}

export interface TimeRange {
  start: number
  end: number
}

export interface Statistics {
  maxPower: number
  minPower: number
  avgPower: number
  dataCount: number
}