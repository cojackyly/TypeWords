<script setup lang="ts">
import { Dialog, Toast } from '@/base'
import { useI18n } from 'vue-i18n'
import {
  getLanSyncUrl,
  LanSyncConnectionError,
  setLanSyncUrl,
  useLanSync,
  type LanSyncConflictChoice,
} from '@/core/composables/useLanSync.ts'

// 區網同步按鈕：手機與電腦都按這顆，和 Mac 上的同步服務交換學習進度
const props = withDefaults(defineProps<{ block?: boolean }>(), { block: false })

const { t: $t } = useI18n()
const lanSync = useLanSync()

let syncing = $ref(false)
let showConflict = $ref(false)
let resolveConflict: ((choice: LanSyncConflictChoice) => void) | null = null

function askConflict(): Promise<LanSyncConflictChoice> {
  showConflict = true
  return new Promise(resolve => (resolveConflict = resolve))
}

// Dialog：確認 = 保留這台；取消 = 使用另一台；右上角關閉 = 這次先不同步
function answerConflict(choice: LanSyncConflictChoice) {
  resolveConflict?.(choice)
  resolveConflict = null
}

function askSyncUrl(message: string): boolean {
  const input = window.prompt(`${message}\n${$t('lan_sync_ask_url')}`, getLanSyncUrl() || 'http://')
  if (!input?.trim()) return false
  setLanSyncUrl(input)
  return true
}

async function runSync() {
  const result = await lanSync.sync(askConflict)
  if (result.cancelled) {
    Toast.info($t('lan_sync_cancelled'))
  } else if (result.pulled.length) {
    Toast.success($t('lan_sync_done_pulled'))
  } else if (result.pushed.length) {
    Toast.success($t('lan_sync_done_pushed'))
  } else {
    Toast.success($t('lan_sync_nothing'))
  }
}

async function onClick() {
  if (syncing) return
  syncing = true
  try {
    try {
      await runSync()
    } catch (e) {
      // 連不到時讓使用者修改同步網址，再試一次
      if (e instanceof LanSyncConnectionError && askSyncUrl(e.message)) {
        await runSync()
      } else {
        throw e
      }
    }
  } catch (e) {
    Toast.error((e as Error)?.message ?? String(e))
  } finally {
    syncing = false
  }
}
</script>

<template>
  <!-- 單一根節點，讓外層傳入的 class 能套用 -->
  <span class="lan-sync-root" :class="{ block: props.block }">
    <button class="lan-sync-btn" :class="{ block: props.block }" :disabled="syncing" @click.stop="onClick">
      <IconEosIconsLoading v-if="syncing" />
      <IconFluentArrowSync20Regular v-else />
      <span>{{ syncing ? $t('lan_syncing') : $t('lan_sync') }}</span>
    </button>
    <Dialog
      v-model="showConflict"
      :title="$t('lan_sync_conflict_title')"
      :content="$t('lan_sync_conflict_content')"
      :confirm-button-text="$t('lan_sync_keep_local')"
      :cancel-button-text="$t('lan_sync_use_remote')"
      :footer="true"
      :padding="true"
      :close-on-click-bg="false"
      @ok="answerConflict('local')"
      @cancel="answerConflict('remote')"
      @close="answerConflict('cancel')"
    />
  </span>
</template>

<style scoped lang="scss">
.lan-sync-root {
  display: inline-flex;

  &.block {
    display: flex;
    width: 100%;
  }
}

.lan-sync-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  padding: 0.35rem 0.8rem;
  border-radius: 1rem;
  border: 1px solid var(--color-item-border);
  background: var(--color-second);
  color: var(--color-main-text);
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
  }

  &.block {
    width: 100%;
    min-height: 48px;
    border-radius: 0.5rem;
    font-size: 1rem;
  }
}
</style>
