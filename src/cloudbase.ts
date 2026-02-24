import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = 'pet-2gwzehxa1e1996ff'

const app = cloudbase.init({
  env: ENV_ID,
  region: 'ap-shanghai',
  accessKey: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL3BldC0yZ3d6ZWh4YTFlMTk5NmZmLmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJwZXQtMmd3emVoeGExZTE5OTZmZiIsImV4cCI6NDA3NTUzODI3MywiaWF0IjoxNzcxODU1MDczLCJub25jZSI6ImdnZS1FR1hFUTN1M0luM1VVaTNIRWciLCJhdF9oYXNoIjoiZ2dlLUVHWEVRM3UzSW4zVVVpM0hFZyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJwZXQtMmd3emVoeGExZTE5OTZmZiIsInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.kfpf15ocuIdrq5jj9O9ycxQGvUtxP4_puE-E-rg0luPkpcmKGT6vGPM6PgY3vI0vzMGfeZCjAplyCtaHxjRZ-WHDXCUKQHuKwbDLeyQ-osMBSP04xAlI70YI5Xus8jUaIHWNrYEC2ODzUTUQIIX3Qsr4Za_NahHFimANM3noHrwbL22IZjEhYlMuxrMsY0YeDfSbvAGUn-WkVcU0lbUcLzE2kgKsSzdrdPRHFNHK4i6KBz3RclcsyaHdfEFPjKf4A1HxmUhwO9ehDbDr0KTL4tMvAdIufTv8xEbFiIPY0kAzsVjnd7vj2RDi15bCX57ajGOkdxfeT3cUIU_QzPtvBg',
  auth: { detectSessionInUrl: true },
})

export const auth = app.auth
export const db = app.database()
export const _ = db.command

// 调用云函数的便捷方法
export async function callPetQuery(action: string, data: Record<string, any>): Promise<any> {
  try {
    console.log(`[CloudBase] 调用云函数 petQuery, action: ${action}`, data)
    const res = await app.callFunction({
      name: 'petQuery',
      data: { action, data },
      parse: true,
    })
    console.log(`[CloudBase] 云函数返回:`, res.result)
    return res.result
  } catch (err: any) {
    console.error(`[CloudBase] 云函数调用失败:`, err)
    // 返回统一的错误格式
    return { 
      success: false, 
      error: err?.message || err?.toString() || '云函数调用失败'
    }
  }
}

export default app
