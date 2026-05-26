import { ref } from 'vue';

export interface AiMeta {
  modelUsed: string;
  degraded: boolean;
  failed?: boolean;
}

const aiMeta = ref<AiMeta | null>(null);
const isUnavailable = ref(false);

export function useAiStatus() {
  function setAiMeta(meta: AiMeta) {
    aiMeta.value = meta;
  }

  function setUnavailable(value: boolean) {
    isUnavailable.value = value;
  }

  function clearAiStatus() {
    aiMeta.value = null;
    isUnavailable.value = false;
  }

  return { aiMeta, isUnavailable, setAiMeta, setUnavailable, clearAiStatus };
}
