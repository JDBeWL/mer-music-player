<template>
  <div class="album-art">
    <img :src="coverUrl" alt="Album Cover" v-if="coverUrl" @error="handleCoverError" />
    <div class="placeholder" v-else>🎵</div>
  </div>
</template>

<script setup>
import "@/assets/css/album-art.css";
import { watch, ref } from 'vue';

const coverUrl = ref('');
const props = defineProps({
  src: String,
  manualCover: String,
  file: Object
});
const emit = defineEmits(['cover-change']);

const PARSERS = {
  'audio/mpeg': parseMP3,
  'audio/mp4': parseMP4,
  'audio/flac': parseFLAC
};

// 图片验证方法
async function isValidCoverPath(path) {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok && response.headers.get('Content-Type').startsWith('image/');
  } catch {
    return false;
  }
}

async function handleCoverError() {
  try {
    if (props.file) {
      await extractCover(props.file);
    } else if (props.src) {
      const valid = await isValidCoverPath(props.src);
      if (!valid) throw new Error('Invalid source URL');
    }
  } catch (error) {
    console.error('Cover recovery failed:', error);
    coverUrl.value = '';
  }
}

async function extractFileCover(file) {
  const buffer = await file.arrayBuffer();
  const mime = file.type || getMimeTypeFromBuffer(buffer);
  const parser = PARSERS[mime];
  if (!parser) return null;

  const coverData = await parser(buffer);
  if (!coverData) return null;

  return URL.createObjectURL(new Blob([coverData.data], { type: coverData.mime || 'image/jpeg' }));
}

// 解析方法
function parseMP3(buffer) {
  const view = new DataView(buffer);
  if (String.fromCharCode(...[...Array(3)].map((_, i) => view.getUint8(i))) !== 'ID3') return null;

  const size = readSyncSafeInt(view.getUint32(6));
  let offset = 10;

  while (offset < size + 10) {
    const frameHeader = new DataView(buffer, offset, 10);
    const frameID = String.fromCharCode(...[...Array(4)].map((_, i) => frameHeader.getUint8(i)));
    const frameSize = frameHeader.getUint32(4, false);

    if (frameID === 'APIC') {
      let pos = offset + 10;
      const mime = readNullTerminatedString(pos, view);
      return {
        data: new Uint8Array(buffer, pos + mime.length + 2),
        mime: mime || 'image/jpeg'
      };
    }
    offset += 10 + frameSize;
  }
  return null;
}

function parseMP4(buffer) {
  const view = new DataView(buffer);
  let offset = 0;

  while (offset < buffer.byteLength) {
    const size = view.getUint32(offset);
    const type = String.fromCharCode(...[...Array(4)].map((_, i) => view.getUint8(offset + 4 + i)));

    if (type === 'moov') {
      const moovEnd = offset + size;
      offset += 8;
      while (offset < moovEnd) {
        const subSize = view.getUint32(offset);
        const subType = String.fromCharCode(...[...Array(4)].map((_, i) => view.getUint8(offset + 4 + i)));
        if (subType === 'udta') {
          const udtaEnd = offset + subSize;
          offset += 8;
          while (offset < udtaEnd) {
            const covrSize = view.getUint32(offset);
            const covrType = String.fromCharCode(...[...Array(4)].map((_, i) => view.getUint8(offset + 4 + i)));
            if (covrType === 'covr') {
              offset += 8;
              const imageType = String.fromCharCode(...[...Array(4)].map((_, i) => view.getUint8(offset + i)));
              return {
                data: new Uint8Array(buffer, offset + 4, covrSize - 12),
                mime: imageType === 'jpeg' ? 'image/jpeg' : 'image/png'
              };
            }
            offset += covrSize;
          }
        }
        offset += subSize;
      }
    }
    offset += size;
  }
  return null;
}

function parseFLAC(buffer) {
  const view = new DataView(buffer);
  if (String.fromCharCode(...[...Array(4)].map((_, i) => view.getUint8(i))) !== 'fLaC') return null;

  let offset = 4;
  while (offset < buffer.byteLength) {
    const header = view.getUint32(offset, false);
    const type = header >>> 24;
    const size = header & 0x00ffffff;

    if (type === 6) {
      const picData = new DataView(buffer, offset + 4, size);
      const mimeLength = picData.getUint32(4, false);
      const mime = String.fromCharCode(...[...Array(mimeLength)].map((_, i) => picData.getUint8(8 + i)));
      return { data: new Uint8Array(buffer, offset + 4 + 8 + mimeLength + 20), mime };
    }
    offset += 4 + size;
  }
  return null;
}

function getMimeTypeFromBuffer(buffer) {
  const header = new Uint8Array(buffer.slice(0, 4));
  if (header[0] === 0xFF && header[1] === 0xFB) return 'audio/mpeg';
  if (String.fromCharCode(...header) === 'ftyp') return 'audio/mp4';
  if (String.fromCharCode(...header) === 'fLaC') return 'audio/flac';
  return 'unknown';
}

watch(
  () => [props.src, props.manualCover, props.file],
  async ([newSrc, newManualCover, newFile]) => {
    let newUrl = '';

    try {
      if (newManualCover) {
        newUrl = await resolveManualCover(newManualCover);
      } else if (newFile) {
        newUrl = await resolveFileCover(newFile);
      } else if (newSrc) {
        newUrl = await resolveExternalCover(newSrc);
      }

      if (newUrl !== coverUrl.value) {
        coverUrl.value = newUrl;
        emit('cover-change', newUrl);
        emit('cover-change', coverUrl.value)
      }
    } catch (error) {
      console.error('Cover processing failed:', error);
    }
  },
  { immediate: true }  // 立即执行一次，确保初始值生效
);

async function resolveManualCover(url) {
  return await isValidCoverPath(url) ? url : '';
}

async function resolveFileCover(file) {
  const blobUrl = await extractFileCover(file);
  return blobUrl || '';
}

async function resolveExternalCover(url) {
  return await isValidCoverPath(url) ? url : '';
}

function readSyncSafeInt(num) {
  return (num & 0x7F) | ((num & 0x7F00) >> 1) | ((num & 0x7F0000) >> 2) | ((num & 0x7F000000) >> 3);
}

function readNullTerminatedString(pos, view) {
  let str = '';
  while (view.getUint8(pos) !== 0 && pos < view.byteLength) {
    str += String.fromCharCode(view.getUint8(pos++));
  }
  return str;
}
</script>
