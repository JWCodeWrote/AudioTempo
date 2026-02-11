const { spawn } = require('node:child_process')
const path = require('node:path')

const args = process.argv.slice(2)
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const pkgPath = require.resolve('electron-vite/package.json')
const cliPath = path.join(path.dirname(pkgPath), 'bin', 'electron-vite.js')

const child = spawn(process.execPath, [cliPath, ...args], {
  stdio: 'inherit',
  env,
  shell: false
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})
