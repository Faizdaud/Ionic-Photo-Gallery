import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo} from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Platform } from '@ionic/angular';
import { LoadingController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { FileSharer } from '@byteowls/capacitor-filesharer';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';

const IMAGE_DIR ='stored-images';
interface LocalFile {
  name: string;
  path: string;
  data: string;
}
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit{

  images: LocalFile[] = []

  constructor(
    private platform: Platform,
    private loadingCtrl: LoadingController,
    private socialSharing: SocialSharing
    ){}

  async ngOnInit(){
    this.loadFiles();

      console.log("All images:")
      console.log(this.images)

      for (let image of this.images){
        console.log(image);
      }
    
  }

  async loadFiles(){
    this.images = [];

    const loading = await this.loadingCtrl.create({
      message: 'Loading data',
    });

    await loading.present();

    Filesystem.readdir({
      directory: Directory.Data,
      path: IMAGE_DIR
    }).then(result =>{
      console.log('HERE', result);
      this.loadFileData(result.files);

    }, async err => {
      console.log('err', err);
      await Filesystem.mkdir({
        directory: Directory.Data,
        path: IMAGE_DIR
        })
      }
    ).then( () => {
      loading.dismiss();
    });

    
  }

  async loadFileData(fileNames: string[]){
    for (let f of fileNames ){
      const filePath = `${IMAGE_DIR}/${f}`;

      const readFile = await Filesystem.readFile({
        directory: Directory.Data,
        path: filePath
      });
      console.log(readFile);

      this.images.push({
        name: f,
        path: filePath,
        data: `data:image/jpeg;base64, ${readFile.data}`
      })
    }
  }

  async selectImage(){
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing:false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });

    console.log('captured image',image)

    if(image){
      this.saveImage(image)
    }

    this.loadFiles();
  }

  async saveImage(photo: Photo){

    //Create base664 data
    const base64Data = await this.readAsBase64(photo);
    console.log('converted image object to base64data', base64Data);

      const fileName = new Date().getTime() + '.jpeg';
      const savedFile = await Filesystem.writeFile({
        directory: Directory.Data,
        path: `${IMAGE_DIR}/${fileName}`,
        data: base64Data
      });

      console.log(`saved file format into IndexedDB localstorage: `, savedFile);
  }

  async readAsBase64(photo: Photo){
    if(this.platform.is('hybrid')){
      const file = await Filesystem.readFile({
        path: photo.path
      });

      return file.data;
    } else{
      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      return await this.convertBlobToBase64(blob) as string;
    }
  }

  //helper function

  convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader;
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  async deleteImage(file: LocalFile){
    await Filesystem.deleteFile({
      directory: Directory.Data,
      path: file.path
    });

    this.loadFiles();
  }

  async shareImage(file:LocalFile){
    // const response = await fetch(file.data);
    // console.log("test upload")
    // await Share.share({
    //   title:"Shared Picture",
    //   url: file.path,
    // })

    // const decodedData = window.atob(file.data); 

    //find image with name from the images array 

    const found = this.images.find(image => image.name == file.name);

    console.log("image choosen:")
    console.log(found.data)
    var newData = found.data.replace('data:image/jpeg;base64,','');
    console.log(newData)

    FileSharer.share({
      filename: file.name,
      base64Data: newData,
      contentType: "image/jpeg",
  })

  // const image = 'base64-string........'


    // this.socialSharing.share(null, null, file.data, null);


    }

  

}
