import * as cropLib from 'cropnow';
import { toBlob, download } from './utils';
import './editor.css';
import '../../node_modules/cropnow/index.css';

const Cropnow = cropLib.default;

const token = import.meta.env.VITE_FASTMODEL_TOKEN;

const selectReports = document.getElementById('reports')!;
const btnShowCropCanvas = document.getElementById('btn-crop')!;
const btnSaveClip = document.getElementById('btn-save-clip')!;
const fileInput = document.getElementById('file-input')!;
const canvasContainer = document.getElementById('container')!;
const imgElement = document.getElementById('img')! as HTMLImageElement;
const alertElement = document.querySelector('.alert')!;

btnShowCropCanvas.style.display = 'none';
btnSaveClip.style.display = 'none';

let isDownload = true;

let blobUrl: string;
let cropper: any;
let title: string;

let imgUrl: any;
let imgWidth;
let imgHeight;

async function getReports() {
  const url = 'https://fastreport-bg.fastmodelsports.com/1/report/';
  try {
    const response = await fetch(url,{
        method: 'GET',
        headers: new Headers({
            'Authorization': 'Bearer '+ token,
            'Content-Type': 'application/x-www-form-urlencoded'
        })
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    let report_response = Object.values(await response.json());

    if (Array.isArray(report_response)) {
      let reports = report_response[0];
      if (Array.isArray(reports)) {
        //Create and append the options
        for (var i = 0; i < reports.length; i++) {
            var option = document.createElement('option');
            option.value = reports[i]['report_id'];
            option.text = reports[i]['subtitle'];
            selectReports.appendChild(option);
        }
      }
    }

  } catch (error) {
    console.error(error.message);
  }
}

getReports();

function selectReport(event) {
    var selectElement = event.target;
    var value = selectElement.value;
    if (isNaN(value) || value === '') {
      isDownload = true;
      btnSaveClip.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewbox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>download clip';
    } else {
      isDownload = false;
      btnSaveClip.innerHTML = 'save clip to Fastscout';
    }
}

selectReports.addEventListener('change', selectReport);

chrome.runtime.sendMessage({ actionType: 'get-screenshot' }, (response) => {
  const { imageBase64, tabTitle } = response;
  if (imageBase64) {
    blobUrl = URL.createObjectURL(toBlob(imageBase64));

    imgElement.style.display = 'block';
    imgElement.src = blobUrl;

    if (btnShowCropCanvas) {
      btnShowCropCanvas.click();
    }
  }
});

const onCropEnded = ({ _, data }) => {
  const { image, cropBox } = data;
  alertElement.innerHTML = `<strong>Original Image: </strong> 
  width ${imgWidth || image.width} | height: ${imgHeight || image.height} 
  / <strong>Crop Box: </strong> ${cropBox.width} | height: ${cropBox.height}`;
};

fileInput.addEventListener('change', onFileChange, false);

function onFileChange() {
  const file = this.files[0];

  if (file) {
    if (cropper) cropper.reset();

    imgElement.style.display = 'none';
    btnSaveClip.style.display = 'flex';

    imgUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = function () {
      let diff =
        img.width > document.body.clientWidth
          ? img.width - document.body.clientWidth
          : 0;
      imgWidth = img.width;
      imgHeight = img.height;
      canvasContainer.style.width = `calc(${img.width}px - ${diff}px)`;
      canvasContainer.style.height = `calc(${img.height}px - ${diff}px)`;
      canvasContainer.style.maxWidth = '100%';
    };

    img.src = imgUrl;
    cropper = new Cropnow(canvasContainer, { url: imgUrl, onCropEnded });
  }
}

const onShowCropCanvas = () => {
  if (cropper) return;

  btnSaveClip.style.display = 'flex';
  imgElement.style.display = 'none';

  const img = new Image();

  img.onload = function () {
    let diff =
      img.width > document.body.clientWidth
        ? img.width - document.body.clientWidth
        : 0;

    canvasContainer.style.width = img.width - diff + 'px';
    canvasContainer.style.height = img.height - diff + 'px';
    canvasContainer.style.maxWidth = '100%';
    alertElement.textContent = `Image: width ${img.width} | height: ${img.height}`;
  };

  img.src = blobUrl;
  cropper = new Cropnow(canvasContainer, { url: blobUrl, onCropEnded });
};

const onDownloadCroppedImage = () => {
  const titleInput = document.getElementById('title') as HTMLInputElement | null;
  title = titleInput ? titleInput.value : '';
  if (title === '') {
    title = new Date().toISOString().slice(0, 19);
  }
  cropper.toPng(title);
  if (titleInput){
    titleInput.value = '';
  }
};

const onLeavePage = (e) => {
  try {
    if (blobUrl) {
      window.URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
      return;
  }
};

const onMessages = async (request, sender, sendResponse) => {
  sendResponse({ from: 'editor' });
};

btnSaveClip.addEventListener('click', onDownloadCroppedImage);
btnShowCropCanvas.addEventListener('click', onShowCropCanvas);
window.addEventListener('beforeunload', onLeavePage);
chrome.runtime.onMessage.addListener(onMessages);
