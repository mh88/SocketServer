@echo on
echo 'install socket.io.server begin...'
set current_path=%cd%
nssm remove socket.io.server confirm
nssm install socket.io.server node %current_path%\server.js
nssm set socket.io.server AppThrottle 1500
nssm set socket.io.server AppExit Default Restart
nssm set socket.io.server AppRestartDelay 0
nssm set socket.io.server AppStderr %current_path%\logs\service.log
net start socket.io.server
echo 'install socket.io.server finish...'
pause