          <div className="flex justify-between items-start mt-12 px-6">
              <div className="text-center w-1/3">
                  <p className="font-black uppercase text-[12px] mb-1">NGƯỜI LẬP PHIẾU</p>
                  <div className="mt-16">
                      <p className="font-black uppercase text-[13px]">{data.requester?.fullName}</p>
                      <p className="text-[9px] font-bold text-blue-600 mt-1">
                          {formatDigitalSignatureDate(data.createdAt)} (Đã ký số)
                      </p>
                  </div>
              </div>
              <div className="text-center w-1/3">
                  <p className="font-black uppercase text-[12px] mb-1">TRƯỞNG BỘ PHẬN</p>
                  <div className="mt-16">
                      <p className="font-black uppercase text-[13px]">{data.approver?.fullName || '..........................'}</p>
                      {data.approvedAt && (
                          <p className="text-[9px] font-bold text-blue-600 mt-1">
                              {formatDigitalSignatureDate(data.approvedAt)} (Đã ký số)
                          </p>
                      )}
                      {!data.approvedAt && <p className="text-[10px] text-slate-400">.../.../...</p>}
                  </div>
              </div>
              <div className="text-center w-1/3">
                  <p className="font-black uppercase text-[12px] mb-1">THỦ KHO / XUẤT</p>
                  <div className="mt-16">
                      <p className="font-black uppercase text-[13px]">..........................</p>
                      <p className="text-[10px] text-slate-400">.../.../...</p>
                  </div>
              </div>
          </div>
