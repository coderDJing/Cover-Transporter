<script setup>
import downIcon from './assets/downIcon.png'
import { ref, nextTick } from 'vue'

const sourceMp3Path = ref('')
let selectDialogShow = false
const blobUrl = ref('')
const selectSourceMp3 = async () => {
  if (selectDialogShow) {
    return
  }
  selectDialogShow = true
  const result = await window.electron.ipcRenderer.invoke('select-SourceMp3')
  selectDialogShow = false
  if (result === null) {
    return
  }
  if (result === 'readFailed') {
    window.electron.ipcRenderer.send(
      'alert',
      'info',
      '提示',
      '选择的MP3文件没有封面，请选择有封面的MP3文件',
      ''
    )
    return
  }
  sourceMp3Path.value = result.filePath
  let blob = new Blob([Uint8Array.from(result.imgData.imageBuffer)], { type: result.imgData.mime })
  URL.revokeObjectURL(blobUrl.value)
  blobUrl.value = URL.createObjectURL(blob)
}
const selectFolders = ref([])
const mode = ref('')
const selectTargetMp3Folder = async () => {
  if (selectDialogShow) {
    return
  }
  selectDialogShow = true
  const result = await window.electron.ipcRenderer.invoke('select-TargetMp3Folder')
  selectDialogShow = false
  if (result === null) {
    return
  }
  selectFolders.value = result
  mode.value = 'folder'
}
const selectMp3Files = ref([])
const selectTargetMp3Files = async () => {
  if (selectDialogShow) {
    return
  }
  selectDialogShow = true
  const result = await window.electron.ipcRenderer.invoke('select-TargetMp3Files')
  selectDialogShow = false
  if (result === null) {
    return
  }
  selectMp3Files.value = result
  mode.value = 'file'
}
const loading = ref(false)
const launch = () => {
  if (!sourceMp3Path.value) {
    window.electron.ipcRenderer.send('alert', 'info', '提示', '请选择要提取封面的MP3文件', '')
    return
  }
  if (!mode.value) {
    window.electron.ipcRenderer.send('alert', 'info', '提示', '请选择要替换的文件夹或MP3文件', '')
    return
  }
  loading.value = true
  window.electron.ipcRenderer.send(
    'replaceCover',
    mode.value + '',
    sourceMp3Path.value + '',
    JSON.parse(JSON.stringify(mode.value === 'folder' ? selectFolders.value : selectMp3Files.value))
  )
}
const barNowNum = ref(0)
const barTotal = ref(1)
window.electron.ipcRenderer.on('progressBar', (event, nowNum, total) => {
  barNowNum.value = nowNum
  barTotal.value = total
  if (nowNum == total) {
    loading.value = false
    barNowNum.value = 0
    barTotal.value = 1
    nextTick(() => {
      window.electron.ipcRenderer.send('alert', 'none', '完成', '搞定了！', '')
    })
  }
})
</script>

<template>
  <div
    v-show="loading"
    style="
      width: 100vw;
      height: 100vh;
      position: absolute;
      z-index: 999;
      top: 0;
      left: 0;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
    "
  >
    <div style="font-size: 20px">
      <div class="container">
        <div class="progress">
          <div class="progress-bar" :style="'width:' + (barNowNum / barTotal) * 100 + '%'"></div>
        </div>
      </div>
    </div>
  </div>
  <div class="mainBody" style="width: 100vw; height: 100vh">
    <div class="functionArea" style="flex-direction: column; align-items: center">
      <div style="width: 400px">
        <div style="display: flex; justify-content: center">
          <div class="button" @click="selectSourceMp3()">选择MP3提取封面</div>
        </div>
        <div v-if="blobUrl" style="display: flex; justify-content: center; padding-top: 20px">
          <img :src="blobUrl" style="width: 150px; height: 150px" :dragable="false" />
        </div>
      </div>
      <div style="display: flex; justify-content: center; padding-top: 10px">
        <img :src="downIcon" style="width: 30px" />
      </div>
    </div>
    <div class="functionArea" style="flex-direction: column; align-items: center">
      <div style="display: flex; justify-content: space-between; width: 400px">
        <div class="button" @click="selectTargetMp3Folder()">选择MP3文件夹</div>
        <div style="line-height: 50px; font-size: 18px">
          <span>或者</span>
        </div>
        <div class="button" @click="selectTargetMp3Files()">选择MP3文件</div>
      </div>
      <div style="font-size: 12px; padding-top: 10px">
        *选择文件夹将会扫描文件夹及其子文件夹下的所有MP3文件<br />
        *两种操作都可以多选
      </div>
      <div v-if="mode === 'folder'" style="padding-top: 10px">
        选择了 {{ selectFolders[0]
        }}{{ selectFolders.length > 1 ? ' 等' + selectFolders.length + '个' : ' ' }}文件夹
      </div>
      <div v-if="mode === 'file'" style="padding-top: 10px">
        选择了{{ selectMp3Files[0]
        }}{{ selectMp3Files.length > 1 ? ' 等' + selectMp3Files.length + '个' : ' ' }}MP3文件
      </div>
    </div>
    <div class="functionArea" style="flex-direction: column; align-items: center; border-bottom: 0">
      <div style="width: 400px">
        <div style="display: flex; justify-content: center">
          <div class="button" @click="launch()">开始替换</div>
        </div>
      </div>
    </div>
  </div>
  <div
    style="
      position: absolute;
      bottom: 10px;
      right: 5px;
      width: 120px;
      height: 20px;
      font-size: 12px;
      color: #cccccc;
    "
  >
    Author : CoderDJing
  </div>
</template>
<style lang="scss" scoped>
.container {
  width: 300px;
  background-color: #cccccc;
}

.progress {
  height: 20px;
  display: flex;
  align-items: center;
}

.progress-bar {
  height: 20px;
  background-color: #0078d4;
}

.functionArea {
  display: flex;
  justify-content: center;
  padding-top: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #42a5f5;
}

.mainBody {
  color: #e3f2fd;
}

.button {
  width: 150px;
  height: 50px;
  line-height: 50px;
  background-color: #1565c0;
  text-align: center;
  border-radius: 10px;

  &:hover {
    background-color: #0d47a1;
  }
}
</style>
