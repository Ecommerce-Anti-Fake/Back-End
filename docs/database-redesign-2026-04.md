# Database redesign 2026-04

## Muc tieu

- Bo sung co che phan phoi giua nha san xuat va dai ly 3 cap.
- Bo sung affiliate 2 tang theo conversion va hoa hong.
- Giu lai cac bang san thuong mai dien tu va chong hang gia hien co.

## Phan phoi 3 cap

- `distribution_network`: mot mang phan phoi theo `brand` va `manufacturer_shop`.
- `distribution_node`: cay thanh vien trong mang, gom nha san xuat va dai ly cap 1-3.
- `distribution_shipment`: phieu chuyen giao hang giua hai node trong mang.
- `distribution_shipment_item`: chi tiet batch/san pham duoc chuyen.

## Tich hop vao du lieu cu

- `offer.distribution_node_id`: xac dinh offer dang duoc dang boi mat xich nao trong kenh phan phoi.
- `supply_batch.distribution_node_id`: gan lo hang vao node dang so huu/nhan lo hang.
- `product_model`, `shop`, `brand` duoc noi vao mang phan phoi de giu traceability.

## Affiliate 2 tang

- `affiliate_program`: chuong trinh affiliate theo scope `shop`, `brand`, `product_model` hoac `offer`.
- `affiliate_account`: tai khoan tham gia chuong trinh; tu lien ket cha-con de bieu dien 2 tang.
- `affiliate_code`: ma affiliate/public link.
- `affiliate_conversion`: ghi nhan don hang hoac su kien duoc attribution.
- `affiliate_commission_ledger`: so cai hoa hong theo tung nguoi huong loi.
- `affiliate_payout`: dot thanh toan hoa hong.

## Nguyen tac mo hinh hoa hong

- Khong ghi truc tiep hoa hong vao `order`.
- `order` chi giu lien ket 1-1 toi `affiliate_conversion`.
- Moi hoa hong tier 1/tier 2 duoc tach thanh dong rieng trong `affiliate_commission_ledger`.

## Don si va don le

- `order.order_mode` phan biet don `RETAIL` va `WHOLESALE`.
- `order.buyer_user_id` dung cho nguoi mua le.
- `order.buyer_shop_id` dung cho shop mua si.
- `order.buyer_distribution_node_id` dung khi don si den tu mot dai ly chinh thuc trong `distribution_network`.

## Chiet khau dai ly

- Chiet khau khong nam o `shop`.
- Chiet khau nam o `distribution_pricing_policy`, gan theo tung `distribution_network`.
- Co the dat policy theo:
- mac dinh ca mang
- cap dai ly
- dai ly cu the
- `product_model` hoac `category`

## Viec can lam tiep

- Tao migration SQL chinh thuc tu schema moi.
- Cap nhat service/repository cho `distribution_*` va `affiliate_*`.
- Neu ban dac ta co rang buoc hoa hong/pham vi cu the, bo sung check constraint va unique index theo nghiep vu.
