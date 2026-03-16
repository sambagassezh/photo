const cameraButton = document.getElementById("cameraButton")
const cameraInput = document.getElementById("cameraInput")
const preview = document.getElementById("preview")

cameraButton.addEventListener("click", () => {
    cameraInput.click()
})

cameraInput.addEventListener("change", (event) => {

    const file = event.target.files[0]

    if (!file) return

    const reader = new FileReader()

    reader.onload = function(e) {
        preview.src = e.target.result
    }

    reader.readAsDataURL(file)

})
