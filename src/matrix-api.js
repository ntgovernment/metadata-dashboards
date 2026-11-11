window.PageDescriptionEditorApi = (() => {
  const MatrixApi = window.Squiz_Matrix_API;
  const matrixApiOptions = new Array();
  matrixApiOptions["key"] = "9772315187";
  const mockValues = new Map();
  const mockContentOwners = new Map([
    ["725680", { name: "Strategy and Performance division", folderId: "283997" }],
    ["421790", { name: "JIIS help desk", folderId: "283997" }],
    ["728555", { name: "AGD ICT Services", folderId: "283997" }],
    ["729570", { name: "Emergency", folderId: "283997" }],
    ["486868", { name: "Bushfires NT", folderId: "283997" }],
    ["702117", { name: "Communications and Media", folderId: "283997" }],
    ["686119", { name: "Ministerial Liaison", folderId: "283997" }],
    ["686256", { name: "Communications", folderId: "283997" }],
    ["686257", { name: "Media", folderId: "283997" }],
    ["700256", { name: "AZRI Library", folderId: "283997" }],
    ["700257", { name: "Berrimah Farm Library", folderId: "283997" }],
    ["705318", { name: "Work health and safety", folderId: "283997" }],
    ["706341", { name: "Governance", folderId: "283997" }],
    ["742611", { name: "Business Services", folderId: "283997" }],
    ["792423", { name: "Manager, Risk and Audit - Governance", folderId: "283997" }],
    ["832991", { name: "Finance", folderId: "283997" }],
  ]);
  const matrixApiClient = MatrixApi ? new MatrixApi(matrixApiOptions) : null;

  function hasMatrixApiConstructor() {
    return typeof MatrixApi !== "undefined";
  }

  function mockSave(assetId, field, value) {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        mockValues.set(`${assetId}:${field}`, value);
        resolve(value);
      }, 250);
    });
  }

  function getMatrixApi() {
    return matrixApiClient;
  }

  function callMatrix(method, options) {
    const api = getMatrixApi();
    if (!api || typeof api[method] !== "function") {
      return Promise.reject(new Error(`Squiz Matrix API method ${method} is unavailable.`));
    }

    return new Promise((resolve, reject) => {
      api[method]({
        ...options,
        dataCallback: resolve,
        errorCallback: () => reject(new Error("Squiz Matrix did not save this change.")),
      });
    });
  }

  function isLocalDevelopment() {
    return !hasMatrixApiConstructor();
  }

  function updateStatus(assetId, status) {
    if (isLocalDevelopment()) {
      return mockSave(assetId, "status", status);
    }

    return callMatrix("setAssetStatus", { asset_id: assetId, status, cascade: false });
  }

  function updateName(assetId, name) {
    if (isLocalDevelopment()) {
      return mockSave(assetId, "name", name);
    }

    return callMatrix("setAttribute", {
      asset_id: assetId,
      attr_name: "name",
      attr_val: name,
    });
  }

  function getWebPath(assetId, fallbackPath) {
    if (isLocalDevelopment()) {
      return Promise.resolve(mockValues.get(`${assetId}:web-path`) || fallbackPath);
    }

    return callMatrix("getWebPath", { asset_id: assetId });
  }

  function updateWebPath(assetId, webPath) {
    if (isLocalDevelopment()) {
      return mockSave(assetId, "web-path", webPath);
    }

    return Promise.reject(
      new Error(
        "Web-path saving is disabled until the Matrix DEV getWebPath and setWebPath payload contract is confirmed. This prevents alternate URLs from being removed.",
      ),
    );
  }

  function updateMetadata(assetId, fieldId, value) {
    if (isLocalDevelopment()) {
      return mockSave(assetId, `metadata:${fieldId}`, value);
    }

    return callMatrix("setMetadata", {
      asset_id: assetId,
      field_id: fieldId,
      field_val: value,
    });
  }

  async function updateContentOwner(assetId, fieldId, ownerAssetId) {
    const value = JSON.stringify([ownerAssetId]);
    if (isLocalDevelopment()) {
      const owner = mockContentOwners.get(ownerAssetId);
      if (!owner || owner.folderId !== "283997") {
        throw new Error("Enter an asset ID for an asset under Contacts (283997).");
      }
      await mockSave(assetId, `metadata:${fieldId}`, value);
      return { assetId: ownerAssetId, name: owner.name };
    }

    await callMatrix("setMetadata", {
      asset_id: assetId,
      field_id: fieldId,
      field_val: value,
    });
    return { assetId: ownerAssetId, name: null };
  }

  return {
    getWebPath,
    isLocalDevelopment,
    updateContentOwner,
    updateMetadata,
    updateName,
    updateStatus,
    updateWebPath,
  };
})();