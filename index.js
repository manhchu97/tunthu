const puppeteer = require("puppeteer-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
const { executablePath } = require("puppeteer");
const randomUseragent = require("random-useragent");
console.log(randomUseragent.getRandomData())

// Cấu hình Stealth Plugin
stealth.enabledEvasions.delete("iframe.contentWindow");
puppeteer.use(stealth);

// Hàm tạo chuỗi ngẫu nhiên
function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Hàm delay ngẫu nhiên
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

puppeteer
  .launch({
    headless: false,
    executablePath: executablePath(), // Dùng bản Chrome của Puppeteer
    args: ["--disable-blink-features=AutomationControlled"],
  })
  .then(async (browser) => {
    const page = await browser.newPage();

    // Thêm một số fake thông tin trình duyệt
    await page.evaluateOnNewDocument(() => {
      const userAgent = randomUseragent.getRandom();
      console.log(userAgent)
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "platform", { get: () => "Win64" });
      Object.defineProperty(navigator, "userAgent", {
        get: () => 'Mozilla/1.22 (compatible; MSIE 5.01; PalmOS 3.0) EudoraWeb 2.1',
      });
      // Giả lập hành vi cuộn trang
      window.scrollBy(0, 100);
    });

    // Bật chế độ intercept request
    await page.setRequestInterception(true);

    // Lắng nghe các yêu cầu mạng
    page.on("request", async (request) => {
      if (
        request.url() === "https://authenticate.riotgames.com/api/v1/login" &&
        request.method() === "PUT"
      ) {
        console.log("Request body:", JSON.parse(request.postData()));

        const cookies = await page.cookies();
        const cookieString = cookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; ");
        console.log(cookieString);

        request.abort();
        try {
          await browser.close();
        } catch (error) {
          console.error("Error closing browser:", error);
        }
      } else {
        request.continue();
      }
    });

    // Đặt Accept-Language header để báo trình duyệt sử dụng tiếng Việt
    await page.setExtraHTTPHeaders({
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    });

    // Đặt navigator.language thành 'vi-VN'
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "language", {
        get: () => "vi-VN",
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["vi-VN", "vi"],
      });
    });

    console.log(
      "Testing the stealth plugin with Vietnamese language settings..."
    );
    await page.goto("https://account.riotgames.com/", {
      waitUntil: "networkidle2",
    });

    // Chờ cho các ô input xuất hiện
    await page.waitForSelector('input[name="username"]');
    await page.waitForSelector('input[name="password"]');

    // Tạo username và password ngẫu nhiên
    const randomUsername = generateRandomString(8); // Chuỗi ngẫu nhiên 8 ký tự
    const randomPassword = generateRandomString(12); // Chuỗi ngẫu nhiên 12 ký tự

    // Điền thông tin username và password ngẫu nhiên
    await page.type('input[name="username"]', randomUsername);
    await page.type('input[name="password"]', randomPassword);

    // Click vào nút submit
    await page.click('[data-testid="btn-signin-submit"]');

    // Chờ đợi thêm nếu cần thiết (có thể chờ điều hướng hoặc xử lý khác)
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Các thao tác khác nếu cần

    await browser.close();
  });
