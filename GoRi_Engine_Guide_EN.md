# 🌀 GoRi Wireless Engine - User Manual

> **Creator:** GoRi (khd57788@gmail.com)  
> **License:** Free for Personal/Non-commercial Use (Paid License required for monetization)

---

The GoRi Engine is currently compatible with Windows only.

> I am a simple man from the rural countryside of South Korea. I know nothing about coding, and I don’t speak any English at all.
While creating YouTube content, I struggled so much with ComfyUI’s complex English settings and that overwhelming "spider web" of connection wires. 
It was so frustrating that I decided to create this myself, just to get rid of those wires.
My partners in this journey were the free version of Gemini and the OpenCode Agent (I am deeply grateful to them).
I used the Bic pickle, MiniMax M2.5 Free, and Nemotron 3 Super Free model engines provided for free by OpenCode.
The GoRi Engine is currently in Beta and has only been tested in my own PC environment, so there may be bugs or errors.
I kindly ask for your generous understanding.

PS. It was incredibly difficult to make. T_T 
If you would like to support my hard work with the price of a cup of coffee, or if you wish to see the GoRi project continue to grow, donations are welcome (but never forced).

International: PayPal - (khd57788@gmail.com)  
South Korea: NH Bank 351-0899-4216-13

---

## What is GoRi?

GoRi is a **wireless signal system** for ComfyUI.  
Instead of connecting nodes with wires, you assign **Channel Names** to each **input** and **output**.  
Nodes with the same channel name communicate automatically — no wires required!

It’s just like a walkie-talkie. If two people tune into Channel 1, they can talk even if they are far apart.

---

## 1. Getting Started
- Extract the file and place the `ComfyUI-GoRi-Wireless` folder into your `ComfyUI/custom_nodes` directory.
- The GoRi Engine is automatically integrated into almost all nodes you use upon starting ComfyUI (with a few exceptions).
- If you install new nodes via the Manager and refresh, the GoRi Engine will be applied automatically. (If not, press **F5** or **Ctrl+F5** to force refresh).

### 1.1 Turning the Engine On
Click the **Hamburger Menu (☰)** next to the "Graph" button. A small window will appear.  
The first switch says **"Engine Active"** or **"Engine Paused"**.

- **Green Light + "Engine Active"**: The engine is running.
- **Red Light + "Engine Paused"**: The engine is resting (wireless signals are cut).

### 1.2 Index Badge Switch
The second switch says **"Index Box Active"** / **"Index Box Hidden"**.

- **ON**: A tag like **GR-001**, **GR-002** appears on the top-right of every node.
- **OFF**: These tags are hidden.

---

## 2. How Wireless Connections Work

### 2.1 Switch Dots (Circles)
There is a **small circle** next to every input and output on a node.

- **Filled Circle**: This port is **Active** (sending or receiving wireless signals).
- **Empty Circle**: This port is **Inactive** (no signal).

**How to use the dots:**

| Action | Result |
|---|---|
| **Left-Click** a dot | Toggle wireless ON/OFF |
| **Right-Click** a dot | Change the Channel Name (Input box appears) |

### 2.2 Channel Names
Every active port has a **Channel Name** (e.g., `CH_001`, `my-channel`).

The rule is simple:
> **If the Output and Input have the same Channel Name, they are connected — even without wires!**

### 2.3 Scope (Channel Zones)
Channels exist within a space called a **Scope**.  
A Scope is defined by a group on the canvas whose name starts with `GORI` (e.g., `GORI:BASE`, `GORI:FX`).

- Nodes inside a `GORI` group only communicate with other nodes in the **same group**.
- Nodes **outside** any `GORI` group use the **GLOBAL** scope — they only communicate with other GLOBAL nodes.

---

## 3. Keyboard Shortcuts

| Key | When? | Action |
|---|---|---|
| **Esc** | Always | Closes the GoRi popup and **Deselects all nodes**. |
| **G** | Engine ON | **Clean Ghost Signals.** Resets GoRi data for selected nodes or removes orphaned data. |
| **S** | Engine ON | **Scan & Re-index.** Re-numbers all nodes (`GR-001`, `GR-002`...) and renames active channels sequentially. |
| **Shift + S** | Engine ON | **Super Assembler.** Converts all existing **wired** connections to **wireless** and removes physical wires instantly. |
| **Ctrl + B** | Anytime | When you **bypass** a node, its linked wireless inputs are automatically disabled. |
| **Ctrl + M** | Anytime | Same as above, but for **muting** nodes. |
| **Alt + Drag** | Canvas | **Multi-Duplicate.** Clone all selected nodes at once by dragging. |

---

## 4. Automatic Features

### 4.1 Guard Loop (The Sentry)
- **New Node Detection**: Automatically handles pasted nodes to prevent channel conflicts.
- **Receiver Blocking**: If a node is disabled, its listeners are cut off and restored upon reactivation.

### 4.2 Copy / Paste & Duplicate
- Pasting a single node resets its data. Pasting multiple nodes generates unique channel names for the new block to avoid overlapping with originals.

### 4.3 Signal Engine (Smart Connection)
- **Safety**: If multiple senders use the same channel, it stays disconnected to prevent errors.
- **Smart Type Matching**: Automatically matches compatible data types (e.g., IMAGE to IMAGE).

---

## 5. Visual Elements

### Index Badge
Top-right tag: `GR-001`. Shows the execution/order number.

### Bezier Curves (Visualization)
- Hover over a node to see connection flow.
- Click a node to reveal persistent curves between all nodes sharing those channels. Deselect to hide.

### Color Coding
Ports are color-coded by type: MODEL(Purple), CLIP(Yellow), VAE(Red), IMAGE(Green), LATENT(Orange), CONDITIONING(Gold), MASK(Blue), CONTROL_NET(Cyan).

---

## 6. Exclusions
Excluded nodes (Stay wired): `GetNode`, `SetNode`, `Reroute`, `ReroutePrimitive`, and any node containing "Everywhere".

---

## 7. 📜 Terms of Use (GoRi Switch Engine)

### 1. Personal & Non-Profit Users (FREE)
- Students, hobbyists, and individual creators can use it for free forever.
- Use for educational or hobby purposes on non-monetized YouTube channels is free.

### 2. Monetized Creators & Influencers (Conditional Free)
- If used on a monetized YouTube channel or paid lectures, you must obtain permission via email (khd57788@gmail.com).
- You must credit "GoRi-Wireless" in the video description or workflow distribution.

### 3. Corporate & Commercial Entities (PAID)
- Use by companies, agencies, or for-profit organizations requires a paid license.
- Unauthorized use or commercial redistribution may lead to legal action.

### 4. Monetized Channel / Corporate / Commercial License
**Cost: 10,000 KRW (approx. $8 USD) per month.** *(Buy time for your workflow for the price of two cups of coffee!)*

- **Target:** Monetized YouTubers, Paid Instructors, Corporations, and Project Groups.
- **Payment:** Send payment via NH Bank or PayPal, then email me for license verification/approval.

**Payment Info:**
- **International:** PayPal - (khd57788@gmail.com)
- **South Korea:** NH Bank 351-0899-4216-13