// Help content for VRA Intelligent Image Optimizer.
// Written in plain, simple language. Each section can be found by the search box.
window.HELP_SECTIONS = [
  {
    title: 'Quick start (4 steps)',
    html: `
      <ol>
        <li>Drag your photos, or a whole folder, into the window. You can also click <b>Add Images</b> or <b>Add Folder</b>.</li>
        <li>Leave the settings as they are. The software opens in <b>Any image &rarr; WebP</b> with <b>Auto (Intelligent)</b> compression.</li>
        <li>Click <b>Optimize</b>. The first time, you choose the folder where the new images are saved.</li>
        <li>Open the output folder and upload the WebP files to your website.</li>
      </ol>
      <div class="tip">Your original photos are never changed or deleted. The new WebP files are saved separately.</div>`
  },
  {
    title: 'Why WebP?',
    html: `
      <p>WebP is an image format made for websites. A WebP file is usually 25% to 35% smaller than a JPG with the same look. Smaller images load faster, which is better for visitors on mobile phones and good for Google ranking.</p>
      <p>A photo straight from a mobile phone can be 3 to 8 MB. After optimizing, it is normally under 200 KB and still looks clean.</p>`
  },
  {
    title: 'Supported image types',
    html: `
      <p><b>Can be opened:</b> JPG, JPEG, PNG, BMP, GIF, TIFF, AVIF, HEIC / HEIF (iPhone photos) and WebP.</p>
      <p><b>Can be created:</b> WebP (main purpose), JPG and PNG.</p>
      <p>HEIC photos from an iPhone take a few seconds each, because they need extra decoding. This is normal.</p>
      <p>An animated GIF becomes an animated WebP.</p>`
  },
  {
    title: 'Convert modes (the dropdown)',
    html: `
      <ul>
        <li><b>Any image &rarr; WebP (recommended):</b> the main mode, used for websites.</li>
        <li><b>WebP &rarr; JPG</b> and <b>WebP &rarr; PNG:</b> for when you need a WebP file in an older format, for example to edit it in another program.</li>
        <li><b>Any image &rarr; JPG</b> and <b>Any image &rarr; PNG:</b> general conversion.</li>
      </ul>
      <p>If you change the mode, files that do not fit the new mode are marked as not supported and skipped.</p>`
  },
  {
    title: 'Auto (Intelligent) compression',
    html: `
      <p>This is the default and the easiest way. For every image, the software works out the best quality by itself:</p>
      <ul>
        <li>It starts at your quality setting (80% by default).</li>
        <li>If the file is still bigger than the target (200 KB by default), it lowers the quality step by step, only as much as needed, to fit under the target.</li>
        <li>It never goes below the <b>lowest quality</b> (60% by default). If an image cannot reach the target even at that quality, it is saved at the lowest quality and marked <b>Larger than target</b>. Nothing is ruined silently.</li>
        <li>Images with text, logos and sharp lines (notices, posters, screenshots) are detected. They keep a higher quality, or are saved lossless, because blur shows on them first.</li>
        <li>A WebP that is already small and not too wide is left as it is.</li>
      </ul>`
  },
  {
    title: 'Manual compression and the quality slider',
    html: `
      <p>Click <b>Manual</b> to use the slider yourself. The slider value is the exact quality used for every image. The target size is not used in Manual mode.</p>
      <ul>
        <li><b>Higher number</b> (90&ndash;100): best look, bigger file.</li>
        <li><b>80%:</b> a very good balance for websites.</li>
        <li><b>60&ndash;70%:</b> small files, fine on mobile screens.</li>
        <li><b>Below 50%:</b> visible blur is likely. Use only if size matters more than look.</li>
      </ul>
      <p>In Auto mode the slider is the <b>starting quality</b>.</p>`
  },
  {
    title: 'Maximum width (1900 px)',
    html: `
      <p>Mobile photos are very large, often 4000 px wide or more. A website never shows that much detail. The software limits the width to <b>1900 px</b>, and the height follows automatically so the shape is not changed.</p>
      <p>Smaller images are never enlarged. You can change the number or switch the limit off in <b>Options</b>.</p>`
  },
  {
    title: 'Target file size (under 200 KB)',
    html: `
      <p>In <b>Options</b> you can set the size you want each image to be under. The default is 200 KB. Tick or untick the box to use it or not, and type another number if a page needs a different size.</p>
      <p>Only Auto compression uses the target. See <i>Auto (Intelligent) compression</i> for what happens when the target cannot be reached.</p>`
  },
  {
    title: 'Removing hidden metadata',
    html: `
      <p>Photos carry hidden information: the GPS location where it was taken, the phone model, date and time, and more. This is called metadata.</p>
      <p>With <b>Remove hidden metadata</b> ticked (the default), all of it is removed. This protects privacy, for example your client's home location, and also makes files a little smaller. Untick it in <b>Options</b> only if you need to keep the information.</p>
      <p>Photos are automatically turned the right way up before the rotation information is removed, so they never appear sideways.</p>`
  },
  {
    title: 'Folders and file names',
    html: `
      <ul>
        <li>If you drop a folder, all images inside it, including sub-folders, are converted. The same folder structure is created in the output folder.</li>
        <li><b>Website-friendly names</b> (default): <i>My Photo 1.JPG</i> becomes <i>my-photo-1.webp</i>. Lowercase, no spaces and no strange characters, so links work properly.</li>
        <li>Existing files are never overwritten. If the name is already used, a number is added, for example <i>my-photo-1-1.webp</i>.</li>
      </ul>`
  },
  {
    title: 'Where are my new images saved?',
    html: `
      <p>The software asks for the folder only once, on the first Optimize. After that it remembers your folder.</p>
      <p>To change it, click <b>Options</b>, then <b>Browse</b>. The <b>Open</b> button there, and the <b>Open output folder</b> link below the list, open the folder in Windows Explorer.</p>`
  },
  {
    title: 'Understanding the results',
    html: `
      <ul>
        <li><b>Optimized at quality N%:</b> done. N is the quality that was needed.</li>
        <li><b>Sharp graphic - saved lossless:</b> a logo or text image was saved with no quality loss.</li>
        <li><b>Larger than target:</b> the image could not go under the target without dropping below the lowest quality. It is saved at the lowest allowed quality. Check it, or allow a lower quality or a smaller width.</li>
        <li><b>Already optimized:</b> a small WebP that needs no change.</li>
        <li><b>Could not open this file:</b> the file is damaged or not a real image.</li>
      </ul>
      <p>The line at the bottom shows the total: how many images, the size before and after, and the percentage saved.</p>`
  },
  {
    title: 'Tips for website work',
    html: `
      <ul>
        <li>Optimize all of a client's photos in one go: collect them in one folder and drop the folder.</li>
        <li>For a full-width banner on a large screen, you may want a higher quality: use Manual at 85&ndash;90%.</li>
        <li>For small pictures on cards or galleries, the default is more than enough.</li>
        <li>Keep the original photos safe as a backup. The WebP files are for the website.</li>
      </ul>`
  },
  {
    title: 'Keyboard and mouse',
    html: `
      <ul>
        <li><b>Esc</b> closes Help, About and Options.</li>
        <li>Drag files or folders from Windows Explorer anywhere into the window.</li>
        <li>The <b>&times;</b> at the end of each row removes that image from the list. It does not delete the file.</li>
      </ul>`
  },
  {
    title: 'Problems and answers',
    html: `
      <ul>
        <li><b>Nothing happens when I drop a file.</b> Check that it is an image type from the list above, and that the Convert mode fits the file.</li>
        <li><b>The new image looks soft.</b> Use Manual mode with a higher quality, or raise the lowest quality in Options.</li>
        <li><b>The file is still big.</b> The image has a lot of fine detail. Lower the maximum width, or raise the target size.</li>
        <li><b>The software asks for a folder every time.</b> It does not. It asks once; if you see it again, the saved folder was cleared in Options.</li>
        <li><b>Does it need internet?</b> No. It works fully offline, and nothing is uploaded.</li>
      </ul>`
  },
  {
    title: 'About the software',
    html: `
      <p>VRA Intelligent Image Optimizer is made by Vidyasagar Robotics Academy. Website: <b>https://vsa.edu.in/</b>. Open <b>About</b> for the complete feature list.</p>
      <p>The software is completely free and is released under the GNU General Public License (GPL v3). You may copy and share it freely. Please keep the VRA name and copyright notice with it.</p>`
  }
];
