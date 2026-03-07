import { spawn } from 'child_process';

const child = spawn('npx', ['tsx', 'server.ts'], { stdio: 'inherit' });

setTimeout(() => {
  child.kill();
  console.log('Server killed after 5 seconds');
}, 5000);
