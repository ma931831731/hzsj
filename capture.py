import os
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options

options = Options()
options.add_argument('--headless')
options.add_argument('--window-size=1280,720')
driver = webdriver.Edge(options=options)

file_url = 'file:///' + os.path.abspath('e:/xuexi/舆情演练系统trea/longnight-prototype/game.html').replace('\\', '/')
driver.get(file_url)
time.sleep(1)

# 1. 初始主界面
driver.save_screenshot('e:/xuexi/舆情演练系统trea/longnight-prototype/preview_main.png')

# 2. 呼出手机通话抽屉
driver.execute_script("openPhoneCall('违停车主 李某', '正在呼叫车主挪车...');")
time.sleep(0.5)
driver.save_screenshot('e:/xuexi/舆情演练系统trea/longnight-prototype/preview_phone.png')

# 3. 触发西门对话弹窗
driver.execute_script("closePhone(); triggerWestGateDialog();")
time.sleep(0.5)
driver.save_screenshot('e:/xuexi/舆情演练系统trea/longnight-prototype/preview_dialog.png')

driver.quit()
print('All previews successfully generated!')
