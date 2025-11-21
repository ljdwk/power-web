import type { PowerData, ChartPoint } from '@/types'

// 数据采样函数 - 使用LTTB (Largest-Triangle-Three-Buckets)算法
function downsampleData(data: ChartPoint[], threshold: number): ChartPoint[] {
  if (data.length <= threshold) return data

  const sampled: ChartPoint[] = []
  const bucketSize = (data.length - 2) / (threshold - 2)

  // 始终保留第一个和最后一个点
  sampled.push(data[0])

  for (let i = 0; i < threshold - 2; i++) {
    // 计算当前bucket的边界
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1

    // 计算当前bucket的平均值
    let avgX = 0, avgY = 0
    const avgRangeLength = avgRangeEnd - avgRangeStart

    for (let j = avgRangeStart; j < avgRangeEnd && j < data.length; j++) {
      avgX += data[j].time
      avgY += data[j].value
    }
    avgX /= avgRangeLength
    avgY /= avgRangeLength

    // 找到当前bucket中具有最大面积的点
    let maxArea = -1
    let maxAreaIndex = avgRangeStart

    for (let j = avgRangeStart; j < avgRangeEnd && j < data.length; j++) {
      const area = Math.abs(
        (data[avgRangeStart].time - avgX) * (data[j].value - data[avgRangeStart].value) -
        (data[avgRangeStart].time - data[j].time) * (avgY - data[avgRangeStart].value)
      ) * 0.5

      if (area > maxArea) {
        maxArea = area
        maxAreaIndex = j
      }
    }

    sampled.push(data[maxAreaIndex])
  }

  sampled.push(data[data.length - 1])
  return sampled
}

export function processChartData(data: PowerData[]): ChartPoint[] {
  if (!data || data.length === 0) return []

  // Sort data by timestamp
  const sorted = data.sort((a, b) =>
    parseInt(a.deviceTime) - parseInt(b.deviceTime)
  )

  // Convert to chart points (convert kW to W)
  const points: ChartPoint[] = sorted.map(item => ({
    time: parseInt(item.deviceTime),
    value: (parseFloat(String(item.gridPower)) || 0) * 1000 // Convert kW to W
  }))

  // 根据数据量动态决定采样策略
  let processedPoints: ChartPoint[] = []

  if (points.length <= 1000) {
    // 小数据量：直接使用
    processedPoints = points
  } else if (points.length <= 10000) {
    // 中等数据量：简单采样
    const samplingRate = Math.ceil(points.length / 1000)
    processedPoints = points.filter((_, index) => index % samplingRate === 0)
  } else {
    // 大数据量：使用LTTB算法
    processedPoints = downsampleData(points, 1000)
  }

  console.log(`数据优化: ${points.length} -> ${processedPoints.length} 点`)

  // 对于采样后的数据，选择性填充间隙
  if (processedPoints.length > 1 && processedPoints.length <= 500) {
    const filledPoints: ChartPoint[] = []
    const interval = 60000 * 5 // 5分钟间隔（采样后减少填充）

    for (let i = 0; i < processedPoints.length - 1; i++) {
      const current = processedPoints[i]
      const next = processedPoints[i + 1]

      filledPoints.push(current)

      // 只对大间隙进行填充
      const gap = next.time - current.time
      if (gap > interval * 3) { // 15分钟以上的间隙才填充
        for (let time = current.time + interval; time < next.time; time += interval * 3) {
          filledPoints.push({
            time,
            value: 0
          })
        }
      }
    }

    filledPoints.push(processedPoints[processedPoints.length - 1])
    return filledPoints
  }

  return processedPoints
}

export function calculateStatistics(values: number[]) {
  if (values.length === 0) {
    return {
      max: 0,
      min: 0,
      avg: 0,
      count: 0
    }
  }

  const validValues = values.filter(v => v > 0)

  return {
    max: Math.max(...values, 0),
    min: Math.min(...validValues, 0),
    avg: validValues.length > 0 ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length : 0,
    count: values.length
  }
}