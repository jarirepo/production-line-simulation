export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise(resolve => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.src = src;
  });
}

export function loadAudio(src: string): Promise<HTMLAudioElement> {
  return new Promise(resolve => {
    const audio = new Audio();
    audio.addEventListener('load', () => resolve(audio));
    audio.src = src;
  });
}
