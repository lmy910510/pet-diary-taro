import { createApp } from 'vue'
import Taro from '@tarojs/taro'
import './styles/index.scss'

const App = createApp({
  async onLaunch() {
    console.log('[App] onLaunch')
    
    // 初始化云开发
    if (Taro.cloud) {
      try {
        await Taro.cloud.init({
          env: 'cloud1-8gx48cqj9601392a',
          traceUser: true
        })
        console.log('[App] 云开发初始化成功')
      } catch (err) {
        console.error('[App] 云开发初始化失败:', err)
      }
    }
  },
  
  onShow() {
    console.log('[App] onShow')
  }
})

export default App
