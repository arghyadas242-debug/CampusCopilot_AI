import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import AdminSidebar from "../../components/admin/AdminSidebar";


const API_URL =
  "http://localhost:5000";


const FILE_RESOURCE_TYPES =
  new Set([
    "PDF",
    "Notes",
    "Question Paper",
    "Other",
  ]);


const resourceTypes = [
  "PDF",
  "Notes",
  "Question Paper",
  "Video",
  "Link",
  "Other",
];


// =====================================================
// LOCAL RESOURCE HELPER
// =====================================================

function isLocalResourceUrl(
  value
) {
  return /^\/api\/resources\/\d+\/file$/.test(
    String(
      value || ""
    )
  );
}


// =====================================================
// OPEN RESOURCE URL
// =====================================================

function getOpenResourceUrl(
  value
) {
  const url =
    String(
      value || ""
    ).trim();


  if (!url) {
    return "";
  }


  if (
    url.startsWith("/")
  ) {
    return `${API_URL}${url}`;
  }


  return url;
}


export default function ResourceManagement() {
  const [
    resources,
    setResources,
  ] =
    useState([]);


  const [
    subjects,
    setSubjects,
  ] =
    useState([]);


  const [
    formData,
    setFormData,
  ] =
    useState({
      subjectCode: "",
      title: "",
      description: "",
      resourceType: "PDF",
      resourceUrl: "",
      semester: "",
      uploadedBy:
        "Academic Office",
    });


  /*
    file = upload actual PDF
    url  = external URL / Drive / video / website
  */

  const [
    sourceMode,
    setSourceMode,
  ] =
    useState("file");


  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState(null);


  const [
    existingResourceUrl,
    setExistingResourceUrl,
  ] =
    useState("");


  const [
    editingId,
    setEditingId,
  ] =
    useState(null);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    deletingId,
    setDeletingId,
  ] =
    useState(null);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    success,
    setSuccess,
  ] =
    useState("");


  // =====================================================
  // LOAD RESOURCES + SUBJECTS
  // =====================================================

  const loadData =
    async () => {
      try {
        setLoading(true);

        setError("");


        const [
          resourcesResponse,
          subjectsResponse,
        ] =
          await Promise.all([
            fetch(
              `${API_URL}/api/admin/resources`
            ),

            fetch(
              `${API_URL}/api/subjects`
            ),
          ]);


        const resourcesData =
          await resourcesResponse.json();


        const subjectsData =
          await subjectsResponse.json();


        if (
          !resourcesResponse.ok
        ) {
          throw new Error(
            resourcesData.error ||
              "Unable to load resources"
          );
        }


        if (
          !subjectsResponse.ok
        ) {
          throw new Error(
            subjectsData.error ||
              "Unable to load subjects"
          );
        }


        setResources(
          Array.isArray(
            resourcesData
          )
            ? resourcesData
            : []
        );


        setSubjects(
          Array.isArray(
            subjectsData
          )
            ? subjectsData
            : []
        );

      } catch (err) {
        console.error(
          "Resource management load error:",
          err
        );


        setError(
          err.message ||
            "Unable to load resource data."
        );

      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    loadData();
  }, []);


  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange =
    (event) => {
      const {
        name,
        value,
      } =
        event.target;


      if (
        name ===
        "resourceType"
      ) {
        /*
          Videos and links cannot use
          local PDF upload mode.
        */

        if (
          value === "Video" ||
          value === "Link"
        ) {
          setSourceMode(
            "url"
          );

          setSelectedFile(
            null
          );
        }
      }


      setFormData(
        (previous) => ({
          ...previous,

          [name]:
            value,
        })
      );


      setError("");

      setSuccess("");
    };


  // =====================================================
  // SOURCE MODE
  // =====================================================

  const handleSourceModeChange =
    (mode) => {
      if (
        mode === "file" &&
        !FILE_RESOURCE_TYPES.has(
          formData.resourceType
        )
      ) {
        setError(
          "PDF upload is available for PDF, Notes, Question Paper and Other resource types."
        );

        return;
      }


      setSourceMode(
        mode
      );


      setSelectedFile(
        null
      );


      setFormData(
        (previous) => ({
          ...previous,

          resourceUrl:
            mode === "file"
              ? ""
              : isLocalResourceUrl(
                  existingResourceUrl
                )
              ? ""
              : previous.resourceUrl,
        })
      );


      setError("");

      setSuccess("");
    };


  // =====================================================
  // FILE CHANGE
  // =====================================================

  const handleFileChange =
    (event) => {
      const file =
        event.target
          .files?.[0] ||
        null;


      if (!file) {
        setSelectedFile(
          null
        );

        return;
      }


      const isPdf =
        file.type ===
          "application/pdf" ||
        file.name
          .toLowerCase()
          .endsWith(
            ".pdf"
          );


      if (!isPdf) {
        event.target.value =
          "";

        setSelectedFile(
          null
        );


        setError(
          "Only PDF files can be uploaded."
        );

        return;
      }


      const maxSize =
        10 *
        1024 *
        1024;


      if (
        file.size >
        maxSize
      ) {
        event.target.value =
          "";

        setSelectedFile(
          null
        );


        setError(
          "PDF file size must be 10 MB or less."
        );

        return;
      }


      setSelectedFile(
        file
      );


      setError("");

      setSuccess("");
    };


  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setEditingId(
      null
    );


    setExistingResourceUrl(
      ""
    );


    setSelectedFile(
      null
    );


    setSourceMode(
      "file"
    );


    setFormData({
      subjectCode: "",
      title: "",
      description: "",
      resourceType:
        "PDF",
      resourceUrl: "",
      semester: "",
      uploadedBy:
        "Academic Office",
    });


    setError("");
  };


  // =====================================================
  // VALIDATE FORM
  // =====================================================

  const validateForm =
    () => {
      if (
        !formData
          .subjectCode
      ) {
        return "Subject is required.";
      }


      if (
        !formData
          .title
          .trim()
      ) {
        return "Resource title is required.";
      }


      if (
        !formData
          .resourceType
      ) {
        return "Resource type is required.";
      }


      if (
        formData.semester &&
        (
          Number(
            formData.semester
          ) < 1 ||
          Number(
            formData.semester
          ) > 8
        )
      ) {
        return "Semester must be between 1 and 8.";
      }


      if (
        sourceMode ===
        "url"
      ) {
        if (
          !formData
            .resourceUrl
            .trim()
        ) {
          return "Resource URL is required.";
        }
      }


      if (
        sourceMode ===
        "file"
      ) {
        if (
          !FILE_RESOURCE_TYPES.has(
            formData
              .resourceType
          )
        ) {
          return "This resource type does not support PDF upload.";
        }


        /*
          New resources always need a file.

          Existing locally uploaded PDFs can be
          edited without uploading the PDF again.
        */

        const alreadyHasLocalFile =
          editingId !== null &&
          isLocalResourceUrl(
            existingResourceUrl
          );


        if (
          !selectedFile &&
          !alreadyHasLocalFile
        ) {
          return "Choose a PDF file to upload.";
        }
      }


      return "";
    };


  // =====================================================
  // ADD / UPDATE RESOURCE
  // =====================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();


      const validationError =
        validateForm();


      if (
        validationError
      ) {
        setError(
          validationError
        );

        return;
      }


      try {
        setSaving(true);

        setError("");

        setSuccess("");


        const isEditing =
          editingId !==
          null;


        const url =
          isEditing
            ? `${API_URL}/api/admin/resources/${editingId}`
            : `${API_URL}/api/admin/resources`;


        /*
          Always use FormData.

          The backend supports multipart/form-data
          for both:
          - PDF upload
          - URL-only resource
        */

        const payload =
          new FormData();


        payload.append(
          "subjectCode",
          formData
            .subjectCode
        );


        payload.append(
          "title",
          formData.title
        );


        payload.append(
          "description",
          formData
            .description
        );


        payload.append(
          "resourceType",
          formData
            .resourceType
        );


        payload.append(
          "semester",
          formData
            .semester
        );


        payload.append(
          "uploadedBy",
          formData
            .uploadedBy
        );


        if (
          sourceMode ===
          "url"
        ) {
          payload.append(
            "resourceUrl",
            formData
              .resourceUrl
          );
        } else {
          /*
            For editing an existing local PDF,
            leaving resourceUrl empty tells the
            backend to preserve the local file URL.
          */

          payload.append(
            "resourceUrl",
            ""
          );


          if (
            selectedFile
          ) {
            payload.append(
              "file",
              selectedFile
            );
          }
        }


        const response =
          await fetch(
            url,
            {
              method:
                isEditing
                  ? "PUT"
                  : "POST",

              body:
                payload,
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Unable to save resource"
          );
        }


        if (
          data.ragReady
        ) {
          setSuccess(
            `${data.message} CampusCopilot indexed ${data.chunkCount || 0} document chunks.`
          );
        } else {
          setSuccess(
            data.message ||
              (
                isEditing
                  ? "Resource updated successfully."
                  : "Resource added successfully."
              )
          );
        }


        resetForm();


        await loadData();

      } catch (err) {
        console.error(
          "Save resource error:",
          err
        );


        setError(
          err.message ||
            "Unable to save resource."
        );

      } finally {
        setSaving(false);
      }
    };


  // =====================================================
  // EDIT RESOURCE
  // =====================================================

  const handleEdit =
    (resource) => {
      const resourceUrl =
        resource
          .RESOURCE_URL ||
        "";


      const localUpload =
        isLocalResourceUrl(
          resourceUrl
        );


      setEditingId(
        resource
          .RESOURCE_ID
      );


      setExistingResourceUrl(
        resourceUrl
      );


      setSelectedFile(
        null
      );


      setSourceMode(
        localUpload
          ? "file"
          : "url"
      );


      setFormData({
        subjectCode:
          resource
            .SUBJECT_CODE ||
          "",

        title:
          resource.TITLE ||
          "",

        description:
          resource
            .DESCRIPTION ||
          "",

        resourceType:
          resource
            .RESOURCE_TYPE ||
          "PDF",

        resourceUrl:
          localUpload
            ? ""
            : resourceUrl,

        semester:
          resource.SEMESTER
            ? String(
                resource
                  .SEMESTER
              )
            : "",

        uploadedBy:
          resource
            .UPLOADED_BY ||
          "Academic Office",
      });


      setError("");

      setSuccess("");


      window.scrollTo({
        top: 0,

        behavior:
          "smooth",
      });
    };


  // =====================================================
  // DELETE RESOURCE
  // =====================================================

  const handleDelete =
    async (resource) => {
      const confirmed =
        window.confirm(
          `Are you sure you want to delete "${resource.TITLE}"?`
        );


      if (!confirmed) {
        return;
      }


      try {
        setDeletingId(
          resource
            .RESOURCE_ID
        );


        setError("");

        setSuccess("");


        const response =
          await fetch(
            `${API_URL}/api/admin/resources/${resource.RESOURCE_ID}`,
            {
              method:
                "DELETE",
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Unable to delete resource"
          );
        }


        if (
          editingId ===
          resource
            .RESOURCE_ID
        ) {
          resetForm();
        }


        setSuccess(
          data.message ||
            "Resource deleted successfully."
        );


        await loadData();

      } catch (err) {
        console.error(
          "Delete resource error:",
          err
        );


        setError(
          err.message ||
            "Unable to delete resource."
        );

      } finally {
        setDeletingId(
          null
        );
      }
    };


  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate =
    (value) => {
      if (!value) {
        return "--";
      }


      const date =
        new Date(
          value
        );


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return value;
      }


      return date
        .toLocaleDateString(
          "en-IN",
          {
            day:
              "2-digit",

            month:
              "short",

            year:
              "numeric",
          }
        );
    };


  // =====================================================
  // FORMAT FILE SIZE
  // =====================================================

  const formatFileSize =
    (bytes) => {
      if (
        !Number.isFinite(
          Number(bytes)
        )
      ) {
        return "";
      }


      const size =
        Number(bytes);


      if (
        size <
        1024 * 1024
      ) {
        return `${(
          size / 1024
        ).toFixed(1)} KB`;
      }


      return `${(
        size /
        (
          1024 *
          1024
        )
      ).toFixed(1)} MB`;
    };


  // =====================================================
  // RESOURCE ICON
  // =====================================================

  const getResourceIcon =
    (type) => {
      switch (type) {
        case "PDF":
          return "picture_as_pdf";

        case "Notes":
          return "description";

        case "Question Paper":
          return "quiz";

        case "Video":
          return "play_circle";

        case "Link":
          return "link";

        default:
          return "folder_open";
      }
    };


  // =====================================================
  // RAG READY
  // =====================================================

  const isRagReady =
    (resource) =>
      Number(
        resource
          .RAG_READY
      ) === 1 ||
      Number(
        resource
          .CHUNK_COUNT
      ) > 0;


  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pb-[64px] md:pb-12">

      <AdminSidebar />


      <main className="md:ml-[280px] min-h-screen flex flex-col">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="sticky top-0 w-full z-40 bg-surface border-b border-outline-variant shadow-xs">

          <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-[1440px] mx-auto w-full">

            <div className="flex items-center gap-4">

              <Link
                to="/admin"
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center"
              >
                <span className="material-symbols-outlined">
                  arrow_back
                </span>
              </Link>


              <h1 className="font-headline-lg-mobile md:font-headline-lg font-bold text-primary">
                Resource Management
              </h1>

            </div>


            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant text-xs">

              <span className="material-symbols-outlined text-primary text-base">
                folder_open
              </span>


              <span className="font-semibold text-on-surface">
                {resources.length} Resources
              </span>

            </div>

          </div>

        </header>


        {/* =================================================
            MAIN
        ================================================= */}

        <div className="flex-1 max-w-[1440px] mx-auto w-full p-4 md:p-8 flex flex-col gap-6 pt-6">

          <div className="flex flex-col gap-6">

            {/* ERROR */}

            {error && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-sm flex items-start gap-2">

                <span className="material-symbols-outlined text-base shrink-0">
                  error
                </span>

                <span>
                  {error}
                </span>

              </div>
            )}


            {/* SUCCESS */}

            {success && (
              <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl text-sm font-bold flex items-start gap-2">

                <span className="material-symbols-outlined text-base shrink-0">
                  check_circle
                </span>

                <span>
                  {success}
                </span>

              </div>
            )}


            {/* =================================================
                ADD / EDIT RESOURCE
            ================================================= */}

            <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

              <div className="flex items-start justify-between gap-4 mb-5">

                <div>

                  <h2 className="font-title-md font-bold text-on-surface text-lg">

                    {editingId
                      ? "Edit Resource"
                      : "Add Study Resource"}

                  </h2>


                  <p className="text-xs text-on-surface-variant mt-1">

                    {editingId
                      ? "Update the selected study resource or replace its PDF."
                      : "Upload PDFs for CampusCopilot Q&A or add external study links."}

                  </p>

                </div>


                <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">

                  <span className="material-symbols-outlined">

                    {editingId
                      ? "edit"
                      : "upload_file"}

                  </span>

                </div>

              </div>


              <form
                onSubmit={
                  handleSubmit
                }
                className="flex flex-col gap-4"
              >

                {/* SUBJECT + TYPE */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="flex flex-col gap-1">

                    <label className="font-label-caps text-outline text-xs uppercase">
                      Subject
                    </label>


                    <select
                      name="subjectCode"
                      value={
                        formData
                          .subjectCode
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                      required
                    >

                      <option value="">
                        Select Subject
                      </option>


                      {subjects.map(
                        (subject) => (
                          <option
                            key={
                              subject
                                .SUBJECT_CODE
                            }
                            value={
                              subject
                                .SUBJECT_CODE
                            }
                          >
                            {
                              subject
                                .SUBJECT_CODE
                            }
                            {" - "}
                            {
                              subject
                                .SUBJECT_NAME
                            }
                          </option>
                        )
                      )}

                    </select>

                  </div>


                  <div className="flex flex-col gap-1">

                    <label className="font-label-caps text-outline text-xs uppercase">
                      Resource Type
                    </label>


                    <select
                      name="resourceType"
                      value={
                        formData
                          .resourceType
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    >

                      {resourceTypes.map(
                        (type) => (
                          <option
                            key={
                              type
                            }
                            value={
                              type
                            }
                          >
                            {type}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                </div>


                {/* TITLE */}

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Resource Title
                  </label>


                  <input
                    name="title"
                    value={
                      formData.title
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Example: DBMS Normalization Notes"
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    required
                  />

                </div>


                {/* DESCRIPTION */}

                <div className="flex flex-col gap-1">

                  <label className="font-label-caps text-outline text-xs uppercase">
                    Description
                  </label>


                  <textarea
                    name="description"
                    value={
                      formData
                        .description
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Describe what this resource contains..."
                    className="w-full min-h-[100px] rounded-xl border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface focus:outline-none focus:border-primary resize-y"
                  />

                </div>


                {/* =================================================
                    RESOURCE SOURCE
                ================================================= */}

                <div className="flex flex-col gap-3">

                  <div>

                    <label className="font-label-caps text-outline text-xs uppercase">
                      Resource Source
                    </label>


                    <p className="text-xs text-on-surface-variant mt-1">
                      Upload a PDF for CampusCopilot document Q&A, or provide an external URL.
                    </p>

                  </div>


                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {/* PDF MODE */}

                    <button
                      type="button"
                      onClick={() =>
                        handleSourceModeChange(
                          "file"
                        )
                      }
                      disabled={
                        !FILE_RESOURCE_TYPES.has(
                          formData
                            .resourceType
                        )
                      }
                      className={`text-left rounded-xl border p-4 transition-all ${
                        sourceMode ===
                        "file"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-outline-variant bg-surface-container-low hover:border-primary/50"
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >

                      <div className="flex items-start gap-3">

                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            sourceMode ===
                            "file"
                              ? "bg-primary-container text-on-primary-container"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >

                          <span className="material-symbols-outlined">
                            picture_as_pdf
                          </span>

                        </div>


                        <div>

                          <div className="font-bold text-sm text-on-surface">
                            Upload PDF
                          </div>


                          <div className="text-xs text-on-surface-variant mt-1">
                            CampusCopilot extracts and indexes the document for AI Q&A.
                          </div>

                        </div>

                      </div>

                    </button>


                    {/* URL MODE */}

                    <button
                      type="button"
                      onClick={() =>
                        handleSourceModeChange(
                          "url"
                        )
                      }
                      className={`text-left rounded-xl border p-4 transition-all ${
                        sourceMode ===
                        "url"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-outline-variant bg-surface-container-low hover:border-primary/50"
                      }`}
                    >

                      <div className="flex items-start gap-3">

                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            sourceMode ===
                            "url"
                              ? "bg-primary-container text-on-primary-container"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >

                          <span className="material-symbols-outlined">
                            link
                          </span>

                        </div>


                        <div>

                          <div className="font-bold text-sm text-on-surface">
                            External URL
                          </div>


                          <div className="text-xs text-on-surface-variant mt-1">
                            Add Drive, website, video, cloud PDF or another study-material link.
                          </div>

                        </div>

                      </div>

                    </button>

                  </div>

                </div>


                {/* =================================================
                    PDF UPLOAD
                ================================================= */}

                {sourceMode ===
                  "file" && (
                  <div className="flex flex-col gap-2">

                    <label className="font-label-caps text-outline text-xs uppercase">
                      PDF File
                    </label>


                    <label className="border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:border-primary transition-colors">

                      <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">

                        <span className="material-symbols-outlined text-[26px]">
                          upload_file
                        </span>

                      </div>


                      <div className="flex-1 min-w-0">

                        {selectedFile ? (
                          <>
                            <div className="font-bold text-sm text-on-surface truncate">
                              {
                                selectedFile
                                  .name
                              }
                            </div>


                            <div className="text-xs text-on-surface-variant mt-1">
                              {formatFileSize(
                                selectedFile
                                  .size
                              )}
                              {" • "}
                              Ready to upload and index
                            </div>
                          </>
                        ) : editingId &&
                          isLocalResourceUrl(
                            existingResourceUrl
                          ) ? (
                          <>
                            <div className="font-bold text-sm text-on-surface">
                              Existing PDF retained
                            </div>


                            <div className="text-xs text-on-surface-variant mt-1">
                              Choose another PDF only if you want to replace and re-index it.
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold text-sm text-on-surface">
                              Choose PDF file
                            </div>


                            <div className="text-xs text-on-surface-variant mt-1">
                              Maximum file size: 10 MB
                            </div>
                          </>
                        )}

                      </div>


                      <div className="px-4 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-primary text-xs font-bold shrink-0">
                        Browse
                      </div>


                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={
                          handleFileChange
                        }
                        className="hidden"
                      />

                    </label>


                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFile(
                            null
                          )
                        }
                        className="self-start text-xs font-semibold text-error hover:underline"
                      >
                        Remove selected file
                      </button>
                    )}


                    <div className="flex items-start gap-2 rounded-xl bg-secondary-container/40 p-3 text-xs text-on-surface-variant">

                      <span className="material-symbols-outlined text-secondary text-[17px] shrink-0">
                        auto_awesome
                      </span>


                      <span>
                        CampusCopilot will extract text and create searchable chunks automatically. This indexing step does not use your Gemini request quota.
                      </span>

                    </div>

                  </div>
                )}


                {/* =================================================
                    EXTERNAL URL
                ================================================= */}

                {sourceMode ===
                  "url" && (
                  <div className="flex flex-col gap-1">

                    <label className="font-label-caps text-outline text-xs uppercase">
                      Resource URL
                    </label>


                    <input
                      type="url"
                      name="resourceUrl"
                      value={
                        formData
                          .resourceUrl
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                      required
                    />


                    <p className="text-xs text-outline">
                      External URLs remain available in the Resource Hub but are not automatically indexed for document Q&A.
                    </p>

                  </div>
                )}


                {/* SEMESTER + UPLOADER */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="flex flex-col gap-1">

                    <label className="font-label-caps text-outline text-xs uppercase">
                      Semester
                    </label>


                    <select
                      name="semester"
                      value={
                        formData
                          .semester
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    >

                      <option value="">
                        All Semesters
                      </option>


                      {[
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                      ].map(
                        (semester) => (
                          <option
                            key={
                              semester
                            }
                            value={
                              semester
                            }
                          >
                            Semester{" "}
                            {semester}
                          </option>
                        )
                      )}

                    </select>

                  </div>


                  <div className="flex flex-col gap-1">

                    <label className="font-label-caps text-outline text-xs uppercase">
                      Uploaded By
                    </label>


                    <input
                      name="uploadedBy"
                      value={
                        formData
                          .uploadedBy
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Academic Office"
                      className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface font-semibold focus:outline-none focus:border-primary"
                    />

                  </div>

                </div>


                {/* BUTTONS */}

                <div className="mt-3 flex flex-wrap justify-end gap-3">

                  {editingId && (
                    <button
                      type="button"
                      onClick={
                        resetForm
                      }
                      disabled={
                        saving
                      }
                      className="px-5 py-2.5 border border-outline-variant text-on-surface-variant font-bold text-sm rounded-xl hover:bg-surface-container-low transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}


                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >

                    <span className="material-symbols-outlined text-[18px]">
                      {sourceMode ===
                      "file"
                        ? "cloud_upload"
                        : "save"}
                    </span>


                    {saving
                      ? selectedFile
                        ? "Uploading & Indexing..."
                        : "Saving..."
                      : editingId
                      ? selectedFile
                        ? "Replace & Re-index PDF"
                        : "Save Changes"
                      : sourceMode ===
                        "file"
                      ? "Upload & Index Resource"
                      : "Add Resource"}

                  </button>

                </div>

              </form>

            </section>


            {/* =================================================
                RESOURCE LIST
            ================================================= */}

            <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 p-5 md:p-6 shadow-sm">

              <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-surface-variant">

                <div>

                  <h2 className="font-title-md font-bold text-on-surface text-lg">
                    Study Resources
                  </h2>


                  <p className="text-xs text-on-surface-variant mt-1">
                    Resources currently stored in the academic database.
                  </p>

                </div>


                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold shrink-0">
                  {resources.length} Total
                </span>

              </div>


              {/* LOADING */}

              {loading && (
                <div className="py-10 text-center text-sm text-on-surface-variant">

                  <span className="material-symbols-outlined text-4xl text-outline">
                    progress_activity
                  </span>


                  <p className="mt-2">
                    Loading resources...
                  </p>

                </div>
              )}


              {/* EMPTY */}

              {!loading &&
                resources.length ===
                  0 && (
                  <div className="py-10 text-center">

                    <span className="material-symbols-outlined text-5xl text-outline">
                      folder_open
                    </span>


                    <p className="text-sm text-on-surface-variant mt-2">
                      No resources found.
                    </p>

                  </div>
                )}


              {/* RESOURCES */}

              {!loading &&
                resources.length >
                  0 && (
                  <div className="flex flex-col divide-y divide-surface-variant">

                    {resources.map(
                      (resource) => {
                        const ragReady =
                          isRagReady(
                            resource
                          );


                        const localUpload =
                          isLocalResourceUrl(
                            resource
                              .RESOURCE_URL
                          );


                        const openUrl =
                          getOpenResourceUrl(
                            resource
                              .RESOURCE_URL
                          );


                        return (
                          <div
                            key={
                              resource
                                .RESOURCE_ID
                            }
                            className="py-5 flex flex-col lg:flex-row lg:items-start justify-between gap-5"
                          >

                            {/* RESOURCE DETAILS */}

                            <div className="flex gap-4 flex-1 min-w-0">

                              <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">

                                <span className="material-symbols-outlined text-[26px]">
                                  {getResourceIcon(
                                    resource
                                      .RESOURCE_TYPE
                                  )}
                                </span>

                              </div>


                              <div className="flex-1 min-w-0">

                                <div className="flex flex-wrap items-center gap-2 mb-2">

                                  <h3 className="font-bold text-on-surface">
                                    {
                                      resource
                                        .TITLE
                                    }
                                  </h3>


                                  <span className="px-2 py-0.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold">
                                    {
                                      resource
                                        .SUBJECT_CODE
                                    }
                                  </span>


                                  <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-bold">
                                    {
                                      resource
                                        .RESOURCE_TYPE
                                    }
                                  </span>


                                  {resource.SEMESTER && (
                                    <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-lg text-xs font-semibold">

                                      Semester{" "}
                                      {
                                        resource
                                          .SEMESTER
                                      }

                                    </span>
                                  )}


                                  {ragReady && (
                                    <span className="px-2 py-0.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center gap-1">

                                      <span className="material-symbols-outlined text-[14px]">
                                        auto_awesome
                                      </span>

                                      AI Ready

                                    </span>
                                  )}


                                  {localUpload &&
                                    !ragReady && (
                                      <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant text-xs font-semibold">
                                        Not Indexed
                                      </span>
                                    )}

                                </div>


                                {resource.DESCRIPTION && (
                                  <p className="text-sm text-on-surface-variant mb-3">
                                    {
                                      resource
                                        .DESCRIPTION
                                    }
                                  </p>
                                )}


                                {ragReady && (
                                  <div className="mb-3 rounded-xl bg-secondary-container/30 border border-secondary/10 p-3">

                                    <div className="flex items-start gap-2">

                                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">
                                        database
                                      </span>


                                      <div>

                                        <div className="text-xs font-bold text-on-surface">
                                          CampusCopilot indexed
                                        </div>


                                        <div className="text-xs text-on-surface-variant mt-0.5">
                                          {Number(
                                            resource
                                              .CHUNK_COUNT
                                          ) || 0} searchable document chunks are ready for resource Q&A.
                                        </div>

                                      </div>

                                    </div>

                                  </div>
                                )}


                                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-outline">

                                  {resource.SUBJECT_NAME && (
                                    <span className="flex items-center gap-1">

                                      <span className="material-symbols-outlined text-[15px]">
                                        menu_book
                                      </span>

                                      {
                                        resource
                                          .SUBJECT_NAME
                                      }

                                    </span>
                                  )}


                                  <span className="flex items-center gap-1">

                                    <span className="material-symbols-outlined text-[15px]">
                                      person
                                    </span>

                                    {
                                      resource
                                        .UPLOADED_BY
                                    }

                                  </span>


                                  <span className="flex items-center gap-1">

                                    <span className="material-symbols-outlined text-[15px]">
                                      calendar_month
                                    </span>

                                    {formatDate(
                                      resource
                                        .CREATED_AT
                                    )}

                                  </span>


                                  <span className="flex items-center gap-1">

                                    <span className="material-symbols-outlined text-[15px]">
                                      {localUpload
                                        ? "cloud_done"
                                        : "link"}
                                    </span>

                                    {localUpload
                                      ? "Campus PDF"
                                      : "External Resource"}

                                  </span>

                                </div>


                                {openUrl && (
                                  <a
                                    href={
                                      openUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-primary hover:underline"
                                  >

                                    <span className="material-symbols-outlined text-[17px]">
                                      open_in_new
                                    </span>

                                    Open Resource

                                  </a>
                                )}

                              </div>

                            </div>


                            {/* ACTIONS */}

                            <div className="flex items-center gap-2 shrink-0">

                              <button
                                type="button"
                                onClick={() =>
                                  handleEdit(
                                    resource
                                  )
                                }
                                className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low flex items-center gap-2 transition-all"
                              >

                                <span className="material-symbols-outlined text-[18px]">
                                  edit
                                </span>

                                Edit

                              </button>


                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    resource
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  resource
                                    .RESOURCE_ID
                                }
                                className="px-4 py-2 border border-error text-error rounded-xl text-sm font-semibold hover:bg-error-container flex items-center gap-2 transition-all disabled:opacity-50"
                              >

                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>


                                {deletingId ===
                                resource
                                  .RESOURCE_ID
                                  ? "Deleting..."
                                  : "Delete"}

                              </button>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

            </section>

          </div>

        </div>

      </main>

    </div>
  );
}