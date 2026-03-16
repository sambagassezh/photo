function applyEffect(imageData, effect) {
    switch (effect) {
        case 'vintage':
            // Logic for applying vintage effect
            break;
        case 'cool':
            // Logic for applying cool effect
            break;
        case 'warm':
            // Logic for applying warm effect
            break;
        case 'vibrant':
            // Logic for applying vibrant effect
            break;
        default:
            throw new Error('Invalid effect type');
    }
}

function sendImage(imageData) {
    // Functionality to send the image with reduced quality
}

function chooseEffect(effect) {
    // Assume `imageData` is already available
    const imageData = getImageData(); // Function to get the current image data
    const processedImage = applyEffect(imageData, effect);
    sendImage(processedImage);
}