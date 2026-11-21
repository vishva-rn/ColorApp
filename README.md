# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Manage the coloring catalog

Use the Supabase Table Editor in the **ColorByNumber** project to manage Canvas and onboarding content.

- Use `catalog_categories` for labels, thumbnails, and display order.
- Use `catalog_drawings` for each drawing's title, main category, palette, and colorable regions. Canvas shows the newest drawings first and uses `sort_order` when drawings have the same `added_at` timestamp. The Popular Picture card shows the drawing with the most completions, with the newest `added_at` breaking ties.
- Use `catalog_drawing_categories` to list a drawing under additional category filters.
- Upload images to the `color-catalog` Storage bucket. Enter the path inside the bucket in `image_path` or `outline_path`. Use a new path when replacing an image so devices fetch the update.

Keep drawing and region IDs stable to preserve saved coloring progress. A region has `id`, `path`, `color`, `x`, `y`, and optional `r` fields. `color` is a one-based index into the palette. For new drawings, use an existing drawing as a template for the JSON fields.

Supabase assigns `added_at` when a drawing is created. Each app installation can add one completion per drawing. Saved completions sync when that installation next loads the catalog online.

Turn off `is_published` to remove an item from Canvas. Pull down on Canvas to fetch changes immediately. The first catalog load requires a connection. The app keeps downloaded catalog metadata for offline use and loads category images and drawing outlines from Storage.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
