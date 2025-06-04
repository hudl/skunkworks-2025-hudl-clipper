import * as cropLib from "cropnow";
import { toBlob, download } from "./utils";
import "./editor.css";
import "../../node_modules/cropnow/index.css";

const Cropnow = cropLib.default;

const btnShowCropCanvas = document.getElementById("btn-crop")!;
const btnSaveClip = document.getElementById("btn-save-clip")!;
const fileInput = document.getElementById("file-input")!;
const canvasContainer = document.getElementById("container")!;
const imgElement = document.getElementById("img")! as HTMLImageElement;
const alertElement = document.querySelector(".alert")!;

btnShowCropCanvas.style.display = "none";
btnSaveClip.style.display = "none";

let blobUrl: string;
let cropper: any;
let title: string;

let imgUrl: any;
let imgWidth;
let imgHeight;

chrome.runtime.sendMessage({ actionType: "get-screenshot" }, (response) => {
  const { imageBase64, tabTitle } = response;
  if (imageBase64) {
    blobUrl = URL.createObjectURL(toBlob(imageBase64));

    imgElement.style.display = "block";
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

fileInput.addEventListener("change", onFileChange, false);

function onFileChange() {
  const file = this.files[0];

  if (file) {
    if (cropper) cropper.reset();

    imgElement.style.display = "none";
    btnSaveClip.style.display = "flex";

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
      canvasContainer.style.maxWidth = "100%";
    };

    img.src = imgUrl;
    cropper = new Cropnow(canvasContainer, { url: imgUrl, onCropEnded });
  }
}

const onShowCropCanvas = () => {
  if (cropper) return;

  btnSaveClip.style.display = "flex";
  imgElement.style.display = "none";

  const img = new Image();

  img.onload = function () {
    let diff =
      img.width > document.body.clientWidth
        ? img.width - document.body.clientWidth
        : 0;

    canvasContainer.style.width = img.width - diff + "px";
    canvasContainer.style.height = img.height - diff + "px";
    canvasContainer.style.maxWidth = "100%";
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
  sendResponse({ from: "editor" });
};

btnSaveClip.addEventListener("click", onDownloadCroppedImage);
btnShowCropCanvas.addEventListener("click", onShowCropCanvas);
window.addEventListener("beforeunload", onLeavePage);
chrome.runtime.onMessage.addListener(onMessages);
