<template>
  <div class="home">
    <div class="hero-section">
      <div class="hero-content">
        <h1>⚡ 功率数据查询系统</h1>
        <p class="hero-subtitle">实时监控光伏电站发电功率数据</p>
      </div>
    </div>

    <div class="container">
      <!-- Station selection card -->
      <div class="card slide-in-left">
        <h2 class="card-title">🏠 选择电站</h2>
        <van-field
          v-model="selectedStation"
          placeholder="点击选择电站"
          readonly
          clickable
          @click="showStationPicker = true"
          class="modern-input"
        />
      </div>

      <!-- Time range selection -->
      <div class="card slide-in-right">
        <h2 class="card-title">📅 时间范围选择</h2>
        <div class="grid grid-2">
          <div class="time-input-group">
            <div class="time-label">开始时间</div>
            <input
              v-model="startTimeInput"
              type="datetime-local"
              class="time-input"
            />
          </div>
          <div class="time-input-group">
            <div class="time-label">结束时间</div>
            <input
              v-model="endTimeInput"
              type="datetime-local"
              class="time-input"
            />
          </div>
        </div>
        <div class="quick-select-buttons">
          <van-button size="small" @click="selectQuickRange('today')">🌞 今天</van-button>
          <van-button size="small" @click="selectQuickRange('3days')">📊 前3天</van-button>
          <van-button size="small" @click="selectQuickRange('7days')">📈 前7天</van-button>
        </div>
        <div class="mt-16">
          <button
            class="query-button"
            :class="{ loading: loading }"
            :disabled="loading"
            @click="queryPowerData"
          >
            <span v-if="!loading">🔍 查询数据</span>
            <span v-else>⏳ 查询中...</span>
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div v-if="statistics" class="card fade-in-up">
        <h2 class="card-title">📊 数据统计</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-icon">⚡</div>
            <div class="stat-label">最大功率</div>
            <div class="stat-value">{{ formatPowerValue(statistics.maxPower) }}</div>
            <div class="stat-trend">峰值功率</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">📉</div>
            <div class="stat-label">最小功率</div>
            <div class="stat-value">{{ formatPowerValue(statistics.minPower) }}</div>
            <div class="stat-trend">最低功率</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">📊</div>
            <div class="stat-label">平均功率</div>
            <div class="stat-value" :class="statistics.avgPower > 0 ? 'positive' : 'negative'">
              {{ formatPowerValue(statistics.avgPower) }}
            </div>
            <div class="stat-trend">平均发电</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">📈</div>
            <div class="stat-label">数据点数</div>
            <div class="stat-value">{{ statistics.dataCount }}</div>
            <div class="stat-trend">采样点</div>
          </div>
        </div>
      </div>

      <!-- Performance Info -->
      <div v-if="chartData.length > 1000" class="card fade-in-up">
        <div class="performance-info">
          <div class="perf-icon">⚡</div>
          <div class="perf-details">
            <div class="perf-title">性能优化</div>
            <div class="perf-description">
              原始数据点较多，已自动优化至 {{ chartData.length }} 个显示点，保证流畅体验
            </div>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div v-if="chartData.length > 0" class="card fade-in-up">
        <h2 class="card-title">📈 功率曲线图</h2>
        <div ref="chartRef" class="chart-container"></div>
      </div>

      <!-- Empty state when no data -->
      <div v-else-if="!loading && selectedStation" class="card text-center fade-in-up">
        <div class="text-center" style="padding: var(--spacing-xl) 0;">
          <div style="font-size: 48px; margin-bottom: var(--spacing); opacity: 0.5;">📊</div>
          <h3 style="color: var(--text-color-light); margin-bottom: var(--spacing-sm);">暂无数据</h3>
          <p style="color: var(--text-color-lighter); font-size: 14px;">
            请选择时间范围并点击"查询数据"按钮获取功率数据
          </p>
        </div>
      </div>
    </div>

    <!-- Station Picker -->
    <van-popup v-model:show="showStationPicker" position="bottom">
      <van-picker
        :columns="stationColumns"
        @confirm="onStationConfirm"
        @cancel="showStationPicker = false"
      />
    </van-popup>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import {
  Field as VanField,
  Button as VanButton,
  Picker as VanPicker,
  Popup as VanPopup,
  showToast
} from 'vant'
import * as echarts from 'echarts'
import { usePowerStore } from '@/stores/powerStore'
import { formatTimestamp, getQuickRange } from '@/utils/timeUtils'
import type { Statistics, ChartPoint } from '@/types'

// 为window添加类型声明
declare global {
  interface Window {
    chartResizeHandler?: (() => void) | null
  }
}

const powerStore = usePowerStore()

// Station selection
const showStationPicker = ref(false)
const selectedStation = ref('')
const stationColumns = ref<string[]>([])

// Time selection
const startTimeInput = ref('')
const endTimeInput = ref('')
const startTime = ref(new Date())
const endTime = ref(new Date())

// Data and UI state
const loading = ref(false)
const statistics = ref<Statistics | null>(null)
const chartData = ref<ChartPoint[]>([])
const chartRef = ref<HTMLElement>()
let chartInstance: any = null // 存储图表实例

// Initialize
onMounted(async () => {
  try {
    await loadStations()
    selectQuickRange('today')
  } catch (error) {
    console.error('组件初始化失败:', error)
    showToast('页面初始化失败，请刷新重试')
  }
})

// 组件卸载时清理资源
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  // 清理全局resize事件
  if (window.chartResizeHandler) {
    window.removeEventListener('resize', window.chartResizeHandler)
    window.chartResizeHandler = undefined
  }
})

const loadStations = async () => {
  try {
    await powerStore.loadStations()
    // Convert to Vant Picker format: array of strings
    stationColumns.value = powerStore.stations.map(s => s.stationId)
    if (stationColumns.value.length > 0) {
      selectedStation.value = stationColumns.value[0]
    }
  } catch (error) {
    showToast('加载电站列表失败')
  }
}

const onStationConfirm = (selectedOptions: any) => {
  selectedStation.value = selectedOptions[0]
  showStationPicker.value = false
}


const selectQuickRange = (type: 'today' | '3days' | '7days') => {
  const range = getQuickRange(type)
  startTime.value = new Date(range.start)
  endTime.value = new Date(range.end)
  updateTimeInputs()
}

const updateTimeInputs = () => {
  startTimeInput.value = formatDateTimeForInput(startTime.value)
  endTimeInput.value = formatDateTimeForInput(endTime.value)
}

const formatDateTimeForInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatPowerValue = (powerWatts: number): string => {
  if (powerWatts === 0) return '0 W'
  const absPower = Math.abs(powerWatts)
  if (absPower >= 1000) {
    return `${(powerWatts / 1000).toFixed(1)} kW`
  } else {
    return `${powerWatts.toFixed(1)} W`
  }
}

const queryPowerData = async () => {
  if (loading.value) {
    console.log('查询正在进行中，忽略重复请求')
    return
  }

  if (!selectedStation.value) {
    showToast('请选择电站')
    return
  }

  // Parse times from input
  if (startTimeInput.value) {
    startTime.value = new Date(startTimeInput.value)
  }
  if (endTimeInput.value) {
    endTime.value = new Date(endTimeInput.value)
  }

  if (startTime.value >= endTime.value) {
    showToast('开始时间必须早于结束时间')
    return
  }

  console.log(`开始查询数据: ${selectedStation.value}`)
  loading.value = true

  try {
    const result = await powerStore.queryPowerData(
      selectedStation.value,
      startTime.value.getTime(),
      endTime.value.getTime()
    )

    console.log('查询成功，准备渲染图表')
    statistics.value = result.statistics
    chartData.value = result.chartData

    // 清理旧图表
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }

    await nextTick()
    await renderChart()

    showToast('查询成功')
  } catch (error) {
    console.error('查询失败:', error)
    showToast('查询失败，请重试')
  } finally {
    loading.value = false
  }
}

const renderChart = async () => {
  if (!chartRef.value) {
    console.error('图表容器不存在')
    return
  }

  if (chartData.value.length === 0) {
    console.log('没有图表数据，清空图表')
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
    return
  }

  // 确保DOM元素已经渲染
  await nextTick()

  const originalDataCount = chartData.value.length
  const startTime = performance.now()

  console.log(`开始渲染图表，数据点: ${originalDataCount}`)

  // 如果已有图表实例，先销毁
  if (chartInstance) {
    console.log('销毁旧图表实例')
    chartInstance.dispose()
    chartInstance = null
  }

  // 创建新的图表实例
  chartInstance = echarts.init(chartRef.value)
  const chart = chartInstance

  // 简化的图表配置，确保基本功能正常
  const option = {
    backgroundColor: 'transparent',
    title: {
      text: '📈 功率趋势分析',
      left: 'center',
      top: 20,
      textStyle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b'
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#6366f1',
      borderWidth: 1,
      borderRadius: 8,
      textStyle: {
        color: '#1e293b',
        fontSize: 13
      },
      padding: [12, 16],
      formatter: function(params: any) {
        if (!params || params.length === 0) return '暂无数据'

        const param = params[0]
        const data = param.data || param
        const timeValue = Array.isArray(data) ? data[0] : (param.axisValue || Date.now())
        const powerValue = Array.isArray(data) ? data[1] : (param.value || 0)

        const absPower = Math.abs(powerValue)
        const displayValue = absPower >= 1000 ? `${(powerValue/1000).toFixed(1)} kW` : `${powerValue.toFixed(1)} W`
        const trend = powerValue > 0 ? '📈' : powerValue < 0 ? '📉' : '➡️'

        return `
          <div style="padding: 8px 12px; border-radius: 8px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-weight: 600; color: #6366f1; margin-bottom: 4px;">
              📊 ${formatTimestamp(timeValue)}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 12px; height: 12px; background: #6366f1; border-radius: 50%;"></div>
              <span style="font-weight: 500;">功率: <strong style="color: #6366f1;">${displayValue}</strong></span>
            </div>
          </div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLine: {
        lineStyle: {
          color: '#e2e8f0',
          width: 1
        }
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed',
          opacity: 0.6
        }
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
        formatter: function(value: number) {
          const date = new Date(value)
          return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        }
      },
      axisTick: {
        lineStyle: {
          color: '#e2e8f0'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '功率',
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: {
        color: '#1e293b',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500
      },
      axisLine: {
        lineStyle: {
          color: '#e2e8f0',
          width: 1
        }
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed',
          opacity: 0.6
        }
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
        formatter: function(value: number) {
          const absValue = Math.abs(value)
          if (absValue >= 1000) {
            return `${(value/1000).toFixed(1)}kW`
          } else {
            return `${value.toFixed(0)}W`
          }
        }
      },
      axisTick: {
        lineStyle: {
          color: '#e2e8f0'
        }
      }
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 20,
        bottom: 10,
        handleStyle: {
          color: '#6366f1'
        },
        textStyle: {
          color: '#64748b',
          fontSize: 10
        },
        borderColor: '#e2e8f0',
        fillerColor: 'rgba(99, 102, 241, 0.2)',
        backgroundColor: '#ffffff'
      }
    ],
    series: [{
      name: '功率',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: function(data: any) {
        // 根据数据量动态调整点的大小
        return chartData.value.length > 500 ? 4 : 6
      },
      sampling: chartData.value.length > 1000 ? 'lttb' : 'average',
      progressive: chartData.value.length > 1000 ? 1000 : 2000,
      progressiveThreshold: chartData.value.length > 1000 ? 1000 : 5000,
      lineStyle: {
        width: chartData.value.length > 500 ? 2 : 3,
        color: '#6366f1'
      },
      itemStyle: {
        color: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
            { offset: 1, color: 'rgba(99, 102, 241, 0.1)' }
          ]
        }
      },
      animation: true,
      animationDuration: chartData.value.length > 1000 ? 1000 : 2000,
      animationEasing: chartData.value.length > 1000 ? 'cubicOut' : 'elasticOut',
      animationDelay: function(idx: number) {
        const delay = chartData.value.length > 1000 ? 10 : 30
        return Math.min(idx * delay, 500)
      },
      data: chartData.value.map((point: any) => [point.time, point.value])
    }]
  }

  chart.setOption(option)

  const renderTime = performance.now() - startTime
  console.log(`图表渲染完成，耗时: ${renderTime.toFixed(2)}ms，数据点: ${originalDataCount}`)

  // 如果数据量很大，显示性能提示
  if (originalDataCount > 5000) {
    showToast(`数据量较大(${originalDataCount}点)，已优化显示`)
  }

  // Enhanced responsive behavior - 避免重复绑定事件
  const handleResize = () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  }

  // 只绑定一次resize事件
  if (!window.chartResizeHandler) {
    window.chartResizeHandler = handleResize
    window.addEventListener('resize', handleResize)
  }

  // 简化的resize观察器
  const resizeObserver = new ResizeObserver(() => {
    if (chartInstance) {
      chartInstance.resize()
    }
  })

  resizeObserver.observe(chartRef.value)

  // 清理函数
  const cleanup = () => {
    resizeObserver.disconnect()
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
  }

  return cleanup
}
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  background: var(--bg-color);
  position: relative;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: var(--primary-gradient);
    opacity: 0.05;
    z-index: -1;
  }
}

.hero-section {
  background: var(--primary-gradient);
  color: white;
  padding: var(--spacing-xl) var(--spacing);
  margin: calc(-1 * var(--spacing-lg)) calc(-1 * var(--spacing-lg)) var(--spacing-lg);
  border-radius: 0 0 var(--border-radius-xl) var(--border-radius-xl);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 300px;
    height: 300px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -5%;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    text-align: center;

    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: var(--spacing-sm);
      letter-spacing: -0.02em;
    }

    .hero-subtitle {
      font-size: 16px;
      opacity: 0.9;
      font-weight: 400;
    }
  }
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  position: relative;

  .time-label {
    font-size: 14px;
    color: var(--text-color-light);
    font-weight: 500;
    margin-bottom: var(--spacing-xs);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);

    &::before {
      content: '📅';
      font-size: 16px;
    }
  }
}

.time-input {
  width: 100%;
  padding: var(--spacing) var(--spacing);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 14px;
  background: var(--card-bg-color);
  color: var(--text-color);
  transition: all var(--transition);
  font-family: 'Inter', sans-serif;

  &:hover {
    border-color: var(--primary-color-light);
  }

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    transform: translateY(-1px);
  }

  &::placeholder {
    color: var(--text-color-lighter);
  }
}

.quick-select-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  margin-top: var(--spacing);

  .van-button {
    border-radius: var(--border-radius);
    border: 2px solid var(--border-color);
    background: var(--card-bg-color);
    color: var(--text-color);
    font-weight: 500;
    transition: all var(--transition);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--primary-gradient);
      opacity: 0;
      transition: opacity var(--transition);
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
      border-color: var(--primary-color-light);

      &::before {
        opacity: 0.1;
      }
    }

    &.van-button--primary {
      background: var(--primary-gradient);
      border-color: transparent;
      color: white;
      font-weight: 600;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
      }
    }

    span {
      position: relative;
      z-index: 1;
    }
  }
}

.query-button {
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: var(--border-radius-large);
  padding: var(--spacing) var(--spacing-xl);
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left var(--transition-slow);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(99, 102, 241, 0.3);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
  }

  &.loading {
    opacity: 0.8;
    cursor: not-allowed;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing);
  margin-top: var(--spacing);

  .stat-item {
    background: var(--card-gradient);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-large);
    padding: var(--spacing-lg);
    text-align: center;
    position: relative;
    overflow: hidden;
    transition: all var(--transition);

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--success-gradient);
      transform: scaleX(0);
      transition: transform var(--transition);
    }

    &:hover {
      transform: translateY(-3px);
      box-shadow: var(--card-shadow-hover);
      border-color: var(--success-color);

      &::before {
        transform: scaleX(1);
      }
    }

    .stat-icon {
      font-size: 24px;
      margin-bottom: var(--spacing-sm);
      display: block;
    }

    .stat-label {
      font-size: 14px;
      color: var(--text-color-light);
      margin-bottom: var(--spacing-xs);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-color);
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: var(--spacing-xs);

      &.positive {
        background: var(--success-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      &.negative {
        background: var(--secondary-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .stat-trend {
      font-size: 12px;
      color: var(--text-color-lighter);
      font-weight: 500;
    }
  }
}

.chart-container {
  width: 100%;
  height: 450px;
  border-radius: var(--border-radius-large);
  overflow: hidden;
  position: relative;
  background: var(--card-gradient);
  box-shadow: var(--card-shadow);

  @media (max-width: 768px) {
    height: 350px;
  }

  @media (max-width: 480px) {
    height: 300px;
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-large);
  z-index: 10;
  backdrop-filter: blur(4px);

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Animation classes for components
.fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

.slide-in-left {
  animation: slideInLeft 0.5s ease-out;
}

.slide-in-right {
  animation: slideInRight 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.performance-info {
  display: flex;
  align-items: center;
  gap: var(--spacing);
  padding: var(--spacing);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.05));
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--border-radius);
  color: #059669;

  .perf-icon {
    font-size: 24px;
    animation: pulse 2s infinite;
  }

  .perf-details {
    flex: 1;

    .perf-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: var(--spacing-xs);
      color: #047857;
    }

    .perf-description {
      font-size: 14px;
      color: #065f46;
      line-height: 1.5;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>