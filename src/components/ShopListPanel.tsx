interface ShopItem {
  name: string;
  value?: string;
}

interface Props {
  title: string;
  shops: ShopItem[];
  onClose: () => void;
  onShopClick: (shopName: string) => void;
}

export default function ShopListPanel({ title, shops, onClose, onShopClick }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xs"
        >
          关闭 ✕
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {shops.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-8">暂无匹配店铺</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {shops.map((item) => (
              <button
                key={item.name}
                onClick={() => onShopClick(item.name)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-xs text-slate-700 truncate flex-1 mr-2">{item.name}</span>
                {item.value && (
                  <span className="text-xs text-slate-400 shrink-0">{item.value}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
