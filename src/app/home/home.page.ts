import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo} from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Platform } from '@ionic/angular';
import { LoadingController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { FileSharer } from '@byteowls/capacitor-filesharer';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';

//define directory location
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
    //take picture using getPhoto Api
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing:false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });

    console.log('captured image',image)

    //if image exist save image into local file storage
    if(image){
      
      this.saveImage(image)
    }
    //load images from local file storage
    this.loadFiles();
  }

  //function for saving image
  async saveImage(photo: Photo){

    //Convert image to base64 data
    const base64Data = await this.readAsBase64(photo);
    console.log('converted image object to base64data', base64Data);

    //create filename
      const fileName = new Date().getTime() + '.jpeg';

      //use filesystem api to write file
      const savedFile = await Filesystem.writeFile({
        directory: Directory.Data,
        path: `${IMAGE_DIR}/${fileName}`,
        data: base64Data
      });

      console.log(`saved file format into IndexedDB localstorage: `, savedFile);
  }

  //function for converting image to base64 data
  //image is photo: Photo
  async readAsBase64(photo: Photo){
    //use Platform service to get information about your current device
    if(this.platform.is('hybrid')){
      //if mobile device use the filesystem api to read the file(file data is already in base64 format)
      const file = await Filesystem.readFile({
        path: photo.path
      });

      return file.data;

      //if for web use fetch api to read file into blob format
    } else{
      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      return await this.convertBlobToBase64(blob) as string;
    }
  }

  //helper function

  convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    //Use JS Api FileReader object to asynchronously read the contents of files (or raw data buffers) stored on the user's computer, 
    //using File or Blob objects to specify the file or data to read.
    const reader = new FileReader;
    reader.onerror = reject;
    //contains an event handler executed when the read file event(reader.readAsDataURL(blob)) is fired
    reader.onload = () => {
      //resolve()
      //---------------------
      //The file's contents. This property is only valid after the read operation is complete, 
      //and the format of the data depends on which of the methods was used to initiate the read operation.
      //reader.result
      //--------------------
      //The FileReader result property returns the file's contents. 
      resolve(reader.result);
    };

    //Starts reading the contents of the specified Blob, 
    //once finished, the result attribute contains a data: URL representing the file's data. convert
    reader.readAsDataURL(blob);
  });


  //function to delete image
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
