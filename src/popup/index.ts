import './popup.css';

function showAlert(text) {
  let alert = document.getElementById('alert');
  if (alert) alert.textContent = text;
  else {
    alert = document.createElement('pre');
    alert.classList.add('alert');
    alert.textContent = text;
    alert.id = 'alert';
    document.body.appendChild(alert);
  }
}

const sendMessage = async (msg) => {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
    const currentTab = tabs[0];

    if (typeof currentTab.url !== 'undefined' && currentTab.url.includes('chrome://')) {
      throw new Error('This page is not supported...');
    } else
      return await chrome.runtime.sendMessage({
        currentTabId: currentTab.id,
        currentTabTitle: currentTab.title,
        ...msg,
      });
  } catch (error) {
    if (!error.message.includes('message port')) showAlert(error.message);
  }
};

const onCaptureFullpage = async () => {
  await sendMessage({ actionType: 'screenshot-fullpage' });
};

const btnCapture = document.getElementById('btn-capture')!;
btnCapture.addEventListener('click', onCaptureFullpage);
