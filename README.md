# Refresh on Hotkey

Launch a managed browser, then refresh it whenever/wherever <kbd>CTRL</kbd> + <kbd>S</kbd> is pressed <strong>& the page HTML's diff contains changes</strong>.

## Prerequisites

-   [Node.js](https://nodejs.org/en/download/)

    You can check if you have Node.js installed by running:

    ```bash
    node -v
    ```

    If you don't have Node.js installed, you can download it from the link above.

## Usage

1. Download all the files in this repository.

    You can do this by <strong>clicking the green "Code" button, then "Download ZIP"</strong>, or by cloning the repository with git:

    ```bash
    git clone https://github.com/sxxov/refresh-on-hotkey
    cd refresh-on-hotkey
    ```

2. Install dependencies & run the script.

    ```bash
    npm install
    npm start
    ```

3. Then, wait for the browser to open & navigate to your desired page.

4. Now, whenever you press <kbd>CTRL</kbd> + <kbd>S</kbd>, the page will refresh <strong>if its HTML has changed.</strong>

## Browser Notes

The managed browser is handled by [Puppeteer](https://pptr.dev/), & uses your system's installed Chrome.

It will store its data in the `.chrome` directory within this project. You can delete the directory to reset the browser's data.

## License

MIT
