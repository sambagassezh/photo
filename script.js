// Wait for page to load before running anything
window.onload = () => {

const SUPABASE_URL = "https://fixpfxlnuhwzvbgcykm.supabase.co"
const SUPABASE_KEY = "PASTE_YOUR_PUBLISHABLE_KEY"

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
)

// Elements
const cameraButton = document.getElementById("cameraButton")
const cameraInput = document.getElementById("cameraInput")

const canvas = document.getElementById("canvas")
const ctx = canvas.getContext("2d")

const previewContainer = document.getElementById("previewContainer")
const sendButton = document.getElementById("sendButton")

let originalImage = null
let currentEffect = "none"

// Open camera
cameraButton.addEventListener("click", () => {
    cameraInput.click()
})

// When user takes picture
cameraInput.addEventListener("change", (event) => {

    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = function(e){

        const img = new Image()

        img.onload = function(){

            const MAX = 800

            let w = img.width
            let h = img.height

            // Resize large images
            if(w > h && w > MAX){
                h = h * MAX / w
                w = MAX
            }
            else if(h > MAX){
                w = w * MAX / h
                h = MAX
            }

            canvas.width = w
            canvas.height = h

            ctx.drawImage(img,0,0,w,h)

            // Store original pixels for effects
            originalImage = ctx.getImageData(0,0,w,h)

            previewContainer.style.display = "block"

        }

        img.src = e.target.result

    }

    reader.readAsDataURL(file)

})


// Effect selection
window.applyEffect = function(effect){

    if(!originalImage) return

    currentEffect = effect

    const imgData = new ImageData(
        new Uint8ClampedArray(originalImage.data),
        originalImage.width,
        originalImage.height
    )

    const data = imgData.data

    if(effect === "cool"){
        for(let i=0;i<data.length;i+=4){
            data[i+2] = Math.min(255,data[i+2] + 40)
        }
    }

    if(effect === "warm"){
        for(let i=0;i<data.length;i+=4){
            data[i] = Math.min(255,data[i] + 40)
        }
    }

    if(effect === "edges"){

        const colors = [
            [252,15,35],
            [34,34,215],
            [252,222,70]
        ]

        for(let i=0;i<data.length;i+=4){

            const gray = (data[i]+data[i+1]+data[i+2])/3

            if(gray > 120){

                const c = colors[Math.floor(Math.random()*colors.length)]

                data[i] = c[0]
                data[i+1] = c[1]
                data[i+2] = c[2]

            }else{

                data[i]=0
                data[i+1]=0
                data[i+2]=0

            }

        }

    }

    ctx.putImageData(imgData,0,0)

}


// Upload to Supabase
sendButton.addEventListener("click", async () => {

    canvas.toBlob(async (blob)=>{

        const filename = `photo_${Date.now()}.jpg`

        const { error } = await supabase.storage
        .from("photos")
        .upload(filename, blob)

        if(error){
            console.error(error)
            alert("Upload failed")
            return
        }

        alert("Photo sent!")

    },"image/jpeg",0.7)

})

}
