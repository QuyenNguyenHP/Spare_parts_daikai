# Interactive Parts Drawing Library

FastAPI and React application for managing many technical drawings, automatically
detecting item-number hotspots, and looking up shared part information.

## Run in WSL

For a fresh WSL environment, install dependencies once from the project root:

```bash
cd "/mnt/c/Users/DAIKAI VR/Desktop/Githup Repo/Spare_parts"
sudo apt install tesseract-ocr
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend install
```

Start the backend:

```bash
python3 backend/app.py
```

Dang nhap mac dinh:

```text
Username: admin
Password: admin123
```

De doi tai khoan, dat bien moi truong trong terminal backend truoc khi chay:

```bash
export SPARE_PARTS_USERNAME="daikai"
export SPARE_PARTS_PASSWORD="replace-with-a-strong-password"
python3 backend/app.py
```

In a second WSL terminal, start the frontend:

```bash
cd "/mnt/c/Users/DAIKAI VR/Desktop/Githup Repo/Spare_parts/frontend"
npm run dev
```

Open `http://localhost:5173`. FastAPI documentation is at
`http://localhost:8000/docs`.

Login page nam tai `frontend/src/pages/LoginPage.jsx` va dung logo
`frontend/public/Daikai-logo-Website.png`. User duoc giu trong `sessionStorage`,
nen dong tab se ket thuc phien. Hien tai login phu hop cho demo/noi bo; cac API
drawing chua bi bao ve boi access token. Can bo sung token authorization truoc
khi public ung dung tren Internet.

## Frontend structure

```text
frontend/src/
|-- App.jsx                         # Session gate: login/logout
|-- config.js                      # API URL and zoom constants
|-- pages/
|   |-- LoginPage.jsx              # Login state and API call
|   |-- DrawingLibraryPage.jsx     # Drawing state, API calls and actions
|   `-- OrderPage.jsx              # Cart review and request submission
|-- components/
|   |-- AppButton.jsx
|   |-- CartItems.jsx
|   |-- DrawingToolbar.jsx
|   |-- CalibrationBar.jsx
|   |-- DrawingViewport.jsx
|   |-- Footer.jsx
|   |-- Header.jsx
|   |-- HeaderIcons.jsx
|   |-- LoginCard.jsx
|   `-- PartPanel.jsx
|-- utils/
|   `-- hotspots.js                # Hotspot sizing helpers
|-- main.jsx
`-- styles.css
```

`pages` quan ly state va goi API. `components` chi nhan props va render tung khoi
giao dien, nen co the chinh sua rieng toolbar, viewport hoac part panel ma khong
can sua logic cua page.

Tat ca nut thao tac dung Material UI thong qua component chung:

```jsx
import AppButton from "../components/AppButton";

<AppButton>Save</AppButton>
<AppButton>Cancel</AppButton>
<AppButton disabled>Delete</AppButton>
<AppButton basic>Basic action</AppButton>
<AppButton href="#parts">Open parts</AppButton>
```

`AppButton` mac dinh dung style cua nut Login voi font weight binh thuong. Them
prop `basic` de dung nut outlined gon, khong shadow; Parts cart va Zoom dung kieu
nay. Hotspot overlay van dung HTML button de khong bi MUI thay doi kich thuoc OCR.

Parts cart duoc luu trong `sessionStorage`. `Add to Parts Request` them part dang
chon vao cart; nut `Parts cart` tren header mo `OrderPage`. Tai day co the sua
quantity, xoa item va bam `Place parts request`. Neu cart co part tu nhieu drawing,
frontend tu dong nhom va tao mot request rieng cho moi drawing.

## Quy trinh them ban ve moi

Chay cac lenh sau tu thu muc goc cua project trong WSL:

```bash
cd "/mnt/c/Users/DAIKAI VR/Desktop/Githup Repo/Spare_parts"
```

### 1. Dat anh vao thu muc item

Vi du voi Item 14 - Cylinder Head:

```text
backend/data/DE18/Chapter2/Item14-cylinder-head/DE18_C2_14.png
```

Ten file PNG duoc giu nguyen. Khong can doi thanh `drawing.png`.

### 2. Dang ky drawing

```bash
python3 backend/manage_drawings.py add \
  --model DE18 \
  --chapter 2 \
  --item 14 \
  --image "backend/data/DE18/Chapter2/Item14-cylinder-head/DE18_C2_14.png"
```

Ten `CYLINDER HEAD` duoc doc tu `chapter.json`. Lenh tren tao drawing ID:

```text
de18-chapter2-item14-cylinder-head
```

### 3. Chay OCR preview

Nhap truoc tat ca callout that su co trong anh bang `--items`. Callout co the la
so hoac chu cai, vi du `1,2,501,A,B,C`. Cach nay giup OCR loai cac ky tu nhan
nham tu chu, kich thuoc va duong ke:

```bash
python3 backend/detect_hotspots.py \
  --drawing de18-chapter2-item14-cylinder-head \
  --items "1,2,3,501,502,503,504"
```

Preview chi hien thi so hotspot/item tim duoc, chua ghi vao file du lieu. Neu OCR
khong tim thay mot so da nhap, terminal se hien `Missing expected items`.

### 4. Luu ket qua OCR

Neu ket qua preview hop ly:

```bash
python3 backend/detect_hotspots.py \
  --drawing de18-chapter2-item14-cylinder-head \
  --items "1,2,3,501,502,503,504" \
  --write
```

`--write` thay the hotspot OCR cu va luu danh sach `expectedItems` vao
`drawing.json`. Lan sau co the bo `--items` vi drawing da nho danh sach nay:

```bash
python3 backend/detect_hotspots.py \
  --drawing de18-chapter2-item14-cylinder-head
```

Thu muc item se co cau truc:

```text
Item14-cylinder-head/
|-- DE18_C2_14.png
|-- drawing.json
|-- hotspots.json
`-- parts.json
```

### 5. Cap nhat thong tin part

Moi drawing co file `parts.json` rieng trong thu muc item. Vi du Item 02:

```text
backend/data/DE18/Chapter2/Item02-engine-side-cover/parts.json
```

Mo file nay va thay cac gia tri `TBD` bang du lieu that tu bang parts PDF. Mapping
giua tai lieu va JSON la:

```text
Number        -> khoa JSON, vi du "1" hoac "A"
Parts Code    -> partNumber
Name of Parts -> name
Quantity      -> quantity
```

Vi du:

```json
{
  "1": {
    "partNumber": "06455-001",
    "name": "COVER",
    "quantity": 10
  },
  "A": {
    "partNumber": "Ref.2-3",
    "name": "ASSY. CRANK CASE SAFETY VALVE",
    "quantity": 2
  }
}
```

Luu file JSON va refresh frontend; backend doc file moi o moi request nen khong
can restart. Can giu dau phay va dau ngoac JSON chinh xac. Item chua co du lieu co
the tam giu `TBD` cho den khi tim thay dong tuong ung trong parts PDF.

### Item co bien the

Vi du Item `12.1`:

```bash
python3 backend/manage_drawings.py add \
  --model DE18 \
  --chapter 2 \
  --item 12.1 \
  --image "backend/data/DE18/Chapter2/Item12.1-mono-block-piston/DE18_C2_12_1.png"
```

Drawing ID tuong ung:

```text
de18-chapter2-item12-1-mono-block-piston
```

### Gioi han item cho OCR

Neu biet truoc cac so callout xuat hien trong anh, them `--items` khi dang ky:

```bash
python3 backend/manage_drawings.py add \
  --model DE18 \
  --chapter 2 \
  --item 14 \
  --image "backend/data/DE18/Chapter2/Item14-cylinder-head/DE18_C2_14.png" \
  --items "1,2,3,501,502,503,504"
```

`--items` la cac so callout ben trong ban ve, khong phai Chapter Item `14`.
Hotspot chu cai cung duoc ho tro, vi du:

```bash
python3 backend/detect_hotspots.py \
  --drawing de18-chapter2-item14-cylinder-head \
  --items "1,2,3,A,B,C,501,502"
```

Chu thuong duoc tu dong chuyen thanh chu hoa. Nen khai bao hotspot chu cai trong
`--items`; neu khong, OCR se bo qua chu cai de tranh nhan nham tieu de va ky hieu
mat cat tren ban ve.

Co the them hoac thay doi danh sach nay khi chay OCR ma khong can dang ky lai
drawing:

```bash
python3 backend/detect_hotspots.py \
  --drawing de18-chapter2-item14-cylinder-head \
  --items "1,2,3,501,502,503,504"
```

## Hieu chinh hotspot sau OCR

Item 02 trong project co cac so that tren ban ve la:

```text
1,2,3,4,5,6,11,12,13,501,502,503,504,505
```

Chay preview tu thu muc goc:

```bash
python3 backend/detect_hotspots.py \
  --drawing de18-chapter2-item02-engine-side-cover \
  --items "1,2,3,4,5,6,11,12,13,501,502,503,504,505"
```

Ket qua hien tai bao thieu `503, 504, 505`; cac ket qua thua nhu `7`, `903`,
`904`, `905`, `5034` bi loai bo. Khi danh sach da dung, ghi ket qua:

```bash
python3 backend/detect_hotspots.py \
  --drawing de18-chapter2-item02-engine-side-cover \
  --items "1,2,3,4,5,6,11,12,13,501,502,503,504,505" \
  --write
```

Sau do refresh frontend va chon `Edit hotspots`:

1. Keo hotspot den dung so tren anh.
2. Double-click tai vi tri bi thieu, sau do nhap item, vi du `503` hoac `A`.
3. Chon hotspot thua va bam `Delete selected`.
4. Bam `Save positions` de ghi vao `hotspots.json` cua drawing dang mo.

Toa do duoc luu theo phan tram, nen vi tri tiep tuc dung khi anh co gian tren
laptop, iPad hoac dien thoai. OCR chi tao vi tri ban dau; buoc hieu chinh tren
frontend la noi xac nhan ket qua cuoi cung.

### Kiem tra danh sach drawing

```bash
python3 backend/manage_drawings.py list
```

Refresh `http://localhost:5173` sau khi drawing da duoc dang ky.

Lenh `add` chi can chay mot lan cho moi drawing. Neu drawing da ton tai, tiep tuc
chay OCR. Chi dung `--replace` khi can thay anh/metadata; thao tac nay se reset
hotspot cua drawing do va can chay OCR lai.

## Import many drawings

Import every PNG from a directory. Each filename must begin with its item,
for example `1-engine-frame.png`, `12.1-mono-block-piston.png`, and
`12.2-build-up-piston.png`:

```bash
python3 backend/manage_drawings.py import-dir "/path/to/100-png-files" \
  --model DE18 \
  --chapter 2
```

Run OCR for the entire drawing library:

```bash
python3 backend/detect_hotspots.py --all --write
```

Supplying `--items` during import improves OCR accuracy when all drawings use the
same item-number set. Drawings with different item sets can be added individually.

## Prepared DE18 Chapter 2 folders

The 46 item directories below have already been created from `chapter.json`:

```text
Item01-engine-frame
Item02-engine-side-cover
Item03-engine-frame-safety-valve
Item04-gear-case
Item05-aux-machinery-gear
Item06-idle-gear
Item07-crankshaft
Item08-balance-weight
Item09-main-bearing
Item10-flywheel
Item11-cylinder-liner
Item12.1-mono-block-piston
Item12.2-build-up-piston
Item13.1-connecting-rod-mono-block-piston
Item13.2-connecting-rod-build-up-piston
Item14-cylinder-head
Item15-cylinder-head-cover
Item16-intake-valve
Item17-exhaust-valve
Item18-starting-valve
Item19-cam-shaft
Item20-cam-shaft-bearing
Item21-intake-exhaust-tappet
Item22-rocker-arm
Item23-fuel-oil-injection-pump
Item24.1-fuel-oil-injection-device
Item24.2-nozzle-holder
Item25-common-rod
Item26.1-governor-driving-device-rhd
Item26.2-governor-driving-device-ug
Item27.1-governor-link-rhd
Item27.2-governor-link-ug
Item28.1-exhaust-manifold-at
Item28.2-exhaust-manifold-met
Item29.1-exhaust-manifold-cover-at
Item29.2-exhaust-manifold-cover-met
Item30.1-turbocharger-fitting-at
Item30.2-turbocharger-fitting-met
Item31-intercooler
Item32.1-intercooler-fitting-at
Item32.2-intercooler-fitting-met
Item33-heatbox
Item34-magnetic-valve-fitting
Item35-control-magnetic-valve
Item36-start-change-switch-box
Item37-indicator
```

Empty item directories contain only `.gitkeep` and are intentionally hidden from
the API and frontend. To activate a prepared item, add its PNG; the English title
is read automatically from `chapter.json`:

```bash
python3 backend/manage_drawings.py add \
  --model DE18 \
  --chapter 2 \
  --item 12.1 \
  --image "/path/to/12.1-drawing.png" \
  --items "1,2,3,501,502"
```

The original PNG filename is preserved. It is stored as `imageFilename` in
`drawing.json`, so images such as `DE18_C2_02.png` do not need to be renamed.

Then run OCR using the drawing ID printed by the `add` command:

```bash
python3 backend/detect_hotspots.py \
  --drawing de18-chapter2-item12-1-mono-block-piston \
  --write
```

To recreate missing placeholder directories from the manifest at any time:

```bash
python3 backend/manage_drawings.py scaffold --model DE18 --chapter 2
```

## Data layout

```text
backend/data/
`-- DE18/
    `-- Chapter2/
        |-- chapter.json
        `-- Item01-engine-frame/
        |-- <original-image-name>.png
        |-- drawing.json
        |-- hotspots.json
        `-- parts.json
```

`chapter.json` is the chapter contents manifest, including variants such as
`12.1` and `12.2`. Each item directory owns its image, metadata, hotspot
coordinates, and part catalog. Item numbers may therefore repeat across drawings
without conflict, and processing one drawing never overwrites another drawing.
