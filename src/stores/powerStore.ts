import { defineStore } from 'pinia'
import { ref } from 'vue'
import { powerApiService } from '@/services/powerApiService'
import type { Station, Statistics } from '@/types'
import { processChartData } from '@/utils/dataUtils'

export const usePowerStore = defineStore('power', () => {
  // State
  const stations = ref<Station[]>([])
  const loading = ref(false)

  // Actions
  const loadStations = async () => {
    loading.value = true
    try {
      const response = await powerApiService.getStations()
      stations.value = response.stations
    } finally {
      loading.value = false
    }
  }

  const queryPowerData = async (stationId: string, startTime: number, endTime: number) => {
    loading.value = true
    try {
      const response = await powerApiService.getPowerData(stationId, startTime, endTime)

      const chartData = processChartData(response.data)

      // Values are already converted to W in processChartData
      const values = chartData.map(d => d.value)
      const validValues = values.filter(v => v > 0)

      const statistics: Statistics = {
        maxPower: values.length > 0 ? Math.max(...values) : 0,
        minPower: values.length > 0 ? Math.min(...values) : 0,
        avgPower: validValues.length > 0 ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length : 0,
        dataCount: chartData.length
      }

      return {
        statistics,
        chartData,
        rawData: response.data
      }
    } finally {
      loading.value = false
    }
  }

  return {
    stations,
    loading,
    loadStations,
    queryPowerData
  }
})