const {
  test,
  expect,
  beforeEach,
  describe,
} = require("@playwright/test");
const { loginWith, createBlog } = require("./helper");

describe("Blog app", () => {
  beforeEach(async ({ page, request }) => {
    await request.post("http://localhost:3001/api/testing/reset");
    await request.post("http://localhost:3001/api/users", {
      data: {
        name: "thai",
        username: "xRiceFarmer",
        password: "123",
      },
    });
    await request.post("http://localhost:3001/api/users", {
      data: {
        username: "james",
        name: "Super",
        password: "1234",
      },
    });

    //login
    const loginResponse = await request.post(
      "http://localhost:3001/api/login",
      {
        data: {
          username: "xRiceFarmer",
          password: "123",
        },
      }
    );
    const token = (await loginResponse.json()).token;

    // Create individual blogs
    await request.post("http://localhost:3001/api/blogs", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: "New Blog",
        author: "Author Name",
        url: "http://example.com",
        likes: 2,
      },
    });

    await request.post("http://localhost:3001/api/blogs", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: "New Blog #2",
        author: "Author Name",
        url: "http://example.com",
        likes: 3,
      },
    });

    await request.post("http://localhost:3001/api/blogs", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: "New Blog #3",
        author: "Author Name",
        url: "http://example.com",
        likes: 4,
      },
    });
    await page.goto("http://localhost:5173");
  });

  test("Login form is shown", async ({ page }) => {
    const loginButton = await page.getByRole("button", { name: "login" });
    const usernameField = await page.getByTestId("username");
    const passwordField = await page.getByTestId("password");

    expect(loginButton).toBeVisible;
    expect(usernameField).toBeVisible;
    expect(passwordField).toBeVisible;
  });
  describe("login", () => {
    test("succeeds with correct credentials", async ({ page }) => {
      await loginWith(page, "james", "1234");
      await expect(page.getByText("Super logged in")).toBeVisible();
      await expect(
        page.getByText("Wrong username or password")
      ).not.toBeVisible();
    });

    test("fails with wrong credentials", async ({ page }) => {
      await loginWith(page, "james", "234");
      const errorDiv = await page.locator(".error");
      await expect(errorDiv).toContainText("Wrong username or password");
      await expect(errorDiv).toHaveCSS("border-style", "solid");
      await expect(errorDiv).toHaveCSS("color", "rgb(255, 0, 0)");
      await expect(page.getByText("Super logged in")).not.toBeVisible();
    });
  });
  describe("When logged in", () => {
    beforeEach(async ({ page }) => {
      await loginWith(page, "james", "1234");
    });

    test("a new blog can be created", async ({ page }) => {
      await createBlog(page, "valo sucks", "gabe", "steam.com");
      await expect(
        page.locator('.success:has-text("a new blog valo sucks by gabe")')
      ).toBeVisible();
    });

    test("the blog can be liked", async ({ page }) => {
      await createBlog(page, "valo sucks", "gabe", "steam.com");
      const blogText = await page.getByText("valo sucks");
      const blogContainer = page.locator(
        '.blog-container:has(.title:has-text("valo sucks"))'
      );

      await blogContainer.getByRole("button", { name: "view" }).click();
      await blogContainer.getByRole("button", { name: "like" }).click();
      await expect(blogContainer.getByText("likes 1")).toBeVisible();
    });

    test("the blog can be deleted by the user who added the blog", async ({ page }) => {
      await createBlog(page, "to be deleted", "gabe", "steam.com");
      const blogContainer = page.locator(
        '.blog-container:has(.title:has-text("to be deleted"))'
      );

      await blogContainer.getByRole("button", { name: "view" }).click();

      page.on("dialog", async (dialog) => {
        console.log(dialog.message());
        await dialog.accept();
      });
      await blogContainer.getByRole("button", { name: "remove" }).click();
      await expect(
        page.locator('.blog-container:has(.title:has-text("to be deleted"))')
      ).not.toBeVisible();
    });
    test("only the user who added the blog sees the blog's delete button.", async({page}) => {
      await createBlog(page, "can delete", "gabe", "steam.com");
      const blogContainer = page.locator(
        '.blog-container:has(.title:has-text("can delete"))'
      );
      await blogContainer.getByRole("button", { name: "view" }).click();

      await expect(
         blogContainer.getByRole("button", { name: "remove" })
      ).toBeVisible()
      
      const otherBlogContainer = page.locator(
        '.blog-container:has(.title:has-text("New Blog #2"))'
      );
      await otherBlogContainer.getByRole("button", { name: "view" }).click();
      await expect(
        otherBlogContainer.getByRole("button", { name: "remove" })
     ).not.toBeVisible()
    })
    test("blogs are arranged in order according to the likes", async ({ page }) => {
      // Check the order of the blogs
      const blogs = await page.locator(".blog-container");
  
      const firstBlog = await blogs.nth(0);
      const secondBlog = await blogs.nth(1);
      const thirdBlog = await blogs.nth(2);
  
      await expect(firstBlog).toContainText("likes 4");
      await expect(secondBlog).toContainText("likes 3");
      await expect(thirdBlog).toContainText("likes 2");
    });
  });
});
