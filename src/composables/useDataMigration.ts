import { ref } from 'vue'
import { usePet } from '@/composables/usePet'
import { useRecords } from '@/composables/useRecords'

const migrationDone = ref(false)
const migrating = ref(false)
const migrationResult = ref<{ pets: boolean; records: number } | null>(null)

export function useDataMigration() {
  async function checkAndMigrate(): Promise<void> {
    if (migrationDone.value || migrating.value) return

    const { getLocalPet, clearLocalPet, savePet, pet } = usePet()
    const { getLocalRecords, clearLocalRecords, migrateLocalRecords } = useRecords()

    const localPet = getLocalPet()
    const localRecords = getLocalRecords()

    // 无本地数据，跳过
    if (!localPet && localRecords.length === 0) {
      migrationDone.value = true
      return
    }

    migrating.value = true
    let petMigrated = false
    let recordsMigrated = 0

    try {
      // 迁移宠物信息（仅当云端无数据时）
      if (localPet && !pet.value.name) {
        await savePet({
          name: localPet.name,
          breed: localPet.breed,
          birthday: localPet.birthday,
          avatar: localPet.avatar,
        })
        petMigrated = true
        clearLocalPet()
      }

      // 迁移记录
      if (localRecords.length > 0) {
        recordsMigrated = await migrateLocalRecords(localRecords)
        if (recordsMigrated > 0) {
          clearLocalRecords()
        }
      }

      migrationResult.value = { pets: petMigrated, records: recordsMigrated }
    } catch (err) {
      console.error('数据迁移失败:', err)
    } finally {
      migrating.value = false
      migrationDone.value = true
    }
  }

  return {
    migrationDone,
    migrating,
    migrationResult,
    checkAndMigrate,
  }
}
