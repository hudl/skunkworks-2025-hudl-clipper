import * as cropLib from 'cropnow';
import { toBlob, download } from './utils';
import './editor.css';
import '../../node_modules/cropnow/index.css';

const Cropnow = cropLib.default;

const token = import.meta.env.VITE_FASTMODEL_TOKEN;
const baseUrl = 'https://fastreport-bg.fastmodelsports.com/1/report/';

const titleInput = document.getElementById('title')!;
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
let title = '', string;

let imgUrl: any;
let imgWidth;
let imgHeight;

const onChangeTite = () => {
  title = titleInput ? (titleInput as HTMLInputElement).value : '';
};

titleInput.addEventListener('change', onChangeTite);

// Function to fetch data from the server
async function getData(url = '', contentType = 'application/x-www-form-urlencoded') {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
          'Authorization': 'Bearer '+ token,
          'Content-Type': contentType
      }
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(error.message);
  }
}

// Function to get reports from the server
async function getReports() {
  try {
    let jsonData = await getData(baseUrl);
    let reportResponse = Object.values(jsonData);
    if (Array.isArray(reportResponse)) {
      let reports = reportResponse[0];
      if (Array.isArray(reports)) {
        //Create and append the options
        for (let i = 0; i < reports.length; i++) {
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

// Function to get the pages by report ID
async function getPagesByReportId(reportId = '') {
  try {
    if (!reportId) {
      throw new Error('Report ID is required');
    }
    let url = baseUrl + reportId + '/page';
    let jsonData = await getData(url);
    return jsonData;
  } catch (error) {
    console.error(error.message);
    return [];
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

const downloadCroppedImage = () => {
  cropper.toPng(title);
};

async function postData(url = '', contentType, data) {
  try {
    const myHeaders = new Headers();
    myHeaders.append('Authorization', 'Bearer ' + token);
    if (contentType) {
      myHeaders.append('Content-Type', contentType);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: myHeaders,
      body: data ? data : null
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(error.message);
  }
}

const uploadCroppedImage = async () => {
  try {
    debugger;

    // First we need to get the report id from the select element
    let reportId = (selectReports as HTMLSelectElement).value;
    if (!reportId) {
      throw new Error('Please select a report');
    }

    // Next we need to get the pages for the selected report
    let pages = await getPagesByReportId(reportId);
    if (!pages || pages.length === 0) {
      throw new Error('No pages found for the selected report');
    }

    // Select the last page from the pages array
    let pageId = '';
    let pageResponse = Object.values(pages);
    if (Array.isArray(pageResponse)) {
      let pageArray = pageResponse[0];
      if (Array.isArray(pageArray)) {
        let page = pageArray.pop();
        pageId = page['page_id'];
        if (!pageId) {
          throw new Error('Page ID not found');
        }
      }
    }

    // Next we need to get the image dimensions
    let cropData = cropper.getData();
    let cropWidth = cropData.cropBox.width;
    let cropHeight = cropData.cropBox.height;

    // Next we need to create a tile for the page of the report
    let tileUrl = baseUrl + reportId + '/tile';

    let widgetData = {
      "image":"",
      "widgetType":"image",
      "widgetTitle":"Image",
      "showTitle":true,
      "isScaled":true
    };
    let gridData = {
      "y":0,
      "w":cropWidth,
      "h":cropHeight,
      "minH":10,
      "x":0,
      "isNew":true
    };
    let tileObject = {
      "tiles": [{
        "version": 2,
        "isNew": Date.now(),
        "report_id": parseInt(reportId),
        "page_id": pageId,
        "widget_data": JSON.stringify(widgetData),
        "grid_data": JSON.stringify(gridData)
      }]
    };

    let tiles = await postData(tileUrl, 'application/json', JSON.stringify(tileObject));
    if (!tiles || tiles.length === 0) {
      throw new Error('No tiles were created for the selected report');
    }

    // Select the last page from the pages array
    let tileId = '';
    let tileResponse = Object.values(tiles);
    if (Array.isArray(tileResponse)) {
      let tileArray = tileResponse[0];
      if (Array.isArray(tileArray)) {
        let tile = tileArray.pop();
        tileId = tile['tile_id'];
        if (!tileId) {
          throw new Error('Tile ID not found in response');
        }
      }
    }

    // Now we can upload the cropped image to the tile
    let imageUrl = baseUrl + reportId + '/tile/' + tileId + '/image';

    let canvas = cropper.getCanvas();
    let dataURL = canvas.toDataURL('image/png');

    let imgObject = await fetch(dataURL);
    let imgBlob = await imgObject.blob();

    let formData = new FormData();
    formData.append('uploadedFile', imgBlob, title+'.png');
    formData.append('imageSize', imgBlob.size.toString());

    let imageData = await postData(imageUrl, null, formData);
    console.log(imageData);

  } catch (error) {
    console.error(error.message);
  }
}

const onSaveClip = () => {
  if (title === '') {
    title = new Date().toISOString().slice(0, 19);
  }
  if (isDownload) {
    downloadCroppedImage();
  } else {
    uploadCroppedImage();
  }
  if (titleInput) {
    (titleInput as HTMLInputElement).value = '';
  }
}

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

btnSaveClip.addEventListener('click', onSaveClip);
btnShowCropCanvas.addEventListener('click', onShowCropCanvas);
window.addEventListener('beforeunload', onLeavePage);
chrome.runtime.onMessage.addListener(onMessages);
