import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
const fs = require('fs').promises
const path = require('path')
const NodeID3 = require('node-id3')
function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 500,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    resizable: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    icon: icon
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  ipcMain.handle('select-SourceMp3', async (e) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'MP3 Files', extensions: ['mp3'] }]
    })
    if (result.canceled) {
      return null
    }
    const tags = NodeID3.read(result.filePaths[0])
    if (tags.image) {
      return { filePath: result.filePaths[0], imgData: tags.image }
    } else {
      return 'readFailed'
    }
  })

  ipcMain.handle('select-TargetMp3Folder', async (e) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'multiSelections']
    })
    if (result.canceled) {
      return null
    }
    return result.filePaths
  })
  ipcMain.handle('select-TargetMp3Files', async (e) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'MP3 Files', extensions: ['mp3'] }]
    })
    if (result.canceled) {
      return null
    }
    return result.filePaths
  })

  async function findMP3Files(directory) {
    let mp3Files = []
    async function traverseDirectory(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (let entry of entries) {
          const fullPath = path.join(dir, entry.name)

          if (entry.isDirectory()) {
            // 递归遍历子目录
            await traverseDirectory(fullPath)
          } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.mp3') {
            // 如果是MP3文件，则添加到结果数组中
            mp3Files.push(fullPath)
          }
        }
      } catch (err) {}
    }

    await traverseDirectory(directory)
    return mp3Files
  }
  ipcMain.on('alert', async (e, type, title, message, detail) => {
    dialog.showMessageBox({
      type, // 可以是 'none', 'info', 'error', 'warning', 'question'
      title, // 这里设置对话框的标题
      message,
      detail
    })
  })
  ipcMain.on('replaceCover', async (e, mode, sourcePath, targetPaths) => {
    // 源MP3文件路径
    const sourceMp3Path = sourcePath
    // 目标MP3文件路径
    let targetMp3Paths = []
    const tags = NodeID3.read(sourceMp3Path)

    const replaceTags = {
      image: tags.image
    }
    if (mode === 'folder') {
      for (let dir of targetPaths) {
        targetMp3Paths = targetMp3Paths.concat(await findMP3Files(dir))
      }
    } else {
      targetMp3Paths = targetPaths
    }
    let index = 1
    for (let item of targetMp3Paths) {
      try {
        NodeID3.update(replaceTags, item)
      } catch (error) {
      } finally {
        index++
        mainWindow.webContents.send('progressBar', index, targetMp3Paths.length)
      }
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
