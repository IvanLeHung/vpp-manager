const fs = require('fs');
const path = 'd:/APP VPP/vpp-manager-main/vpp-manager-main/src/pages/requests/RequestsDetail.tsx';
let c = fs.readFileSync(path, 'utf8');

const m = {
    'Xuáº¥t': 'Xuất',
    'Vá»‡': 'Vệ',
    'Váº­t': 'Vật',
    'TÆ°': 'Tư',
    'phiáº¿u': 'phiếu',
    'tráº¡ng': 'trạng',
    'Thao tÃ¡c': 'Thao tác',
    'Báº£ng kÃª': 'Bảng kê',
    'thá»±c táº¿': 'thực tế',
    'Chá» n': 'Chọn',
    'ChÃ­nh': 'Chính',
    'LÆ°u Ã½': 'Lưu ý',
    'váº­n hÃ nh': 'vận hành',
    'Há»‡ thá»‘ng': 'Hệ thống',
    'nháº­p': 'nhập',
    'trÆ°á»›c': 'trước',
    'ká»¹': 'kỹ',
    'Kiá»ƒm tra': 'Kiểm tra',
    'KHÃ”NG Ä á»¦ Tá»’N Ä á»‚ XUáº¤T': 'KHÔNG ĐỦ TỒN ĐỂ XUẤT',
    'XÃ C NHáº¬N XUáº¤T': 'XÁC NHẬN XUẤT',
    'Ä Ã£ thay tháº¿': 'Đã thay thế',
    'Ä VT': 'ĐVT',
    'Duyá»‡t': 'Duyệt',
    'Ä Ã£ táº¡o': 'Đã tạo',
    'thÃ nh cá»™ng': 'thành công',
    'XÃ¡c nháº­n cáº¥p phÃ¡t': 'Xác nhận cấp phát',
    'Báº¡n Ä‘ang thá»±c hiá»‡n': 'Bạn đang thực hiện',
    'váº­t tÆ°': 'vật tư',
    'hoÃ n tÃ¡c': 'hoàn tác',
    'CÃ³ dÃ²ng vÆ°á»£t tá»“n kho': 'Có dòng vượt tồn kho',
    'Vui lÃ²ng kiá»ƒm tra láº¡i': 'Vui lòng kiểm tra lại',
    'Cáº¤P PHÃ T Váº¬T TÆ¯ THÃ€NH CÃ”NG': 'CẤP PHÁT VẬT TƯ THÀNH CÔNG',
    'Ä ANG CHá»œ NHÃ‚N Sá»° XÃ C NHáº¬N': 'ĐANG CHỜ NHÂN SỰ XÁC NHẬN',
    'Quay láº¡i chá»‰nh sá»­a': 'Quay lại chỉnh sửa'
};

Object.keys(m).forEach(k => {
    c = c.split(k).join(m[k]);
});

fs.writeFileSync(path, c, 'utf8');
console.log('Fixed Mojibake in RequestsDetail.tsx');
