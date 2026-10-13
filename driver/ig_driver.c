#include <fltKernel.h>
#include <dontuse.h>

#pragma prefast(disable:__WARNING_ENCODE_MEMBER_FUNCTION_POINTER, "Not valid for kernel mode drivers")

PFLT_FILTER gFilterHandle;
PFLT_PORT gServerPort;
PFLT_PORT gClientPort;

#define IG_PORT_NAME L"\\IntegrityGuardianPort"
#define IG_SERVICE_ID L"IntegrityGuardianService"

#define IG_OPERATION_READ       0x0001
#define IG_OPERATION_WRITE      0x0002
#define IG_OPERATION_DELETE     0x0004
#define IG_OPERATION_RENAME     0x0008
#define IG_OPERATION_MOVE       0x0010
#define IG_OPERATION_TRUNCATE   0x0020
#define IG_OPERATION_SET_INFO   0x0040

typedef struct _IG_AUTH_REQUEST {
    ULONG RequestId;
    ULONG OperationMask;
    ULONG RequestedAccess;
    ULONG Classification;
    WCHAR FilePath[512];
    WCHAR UserName[128];
    ULONG ProcessId;
    LARGE_INTEGER Timestamp;
    LARGE_INTEGER ExpiresAt;
} IG_AUTH_REQUEST, *PIG_AUTH_REQUEST;

NTSTATUS
IgUnload (
    _In_ FLT_FILTER_UNLOAD_FLAGS Flags
    );

FLT_PREOP_CALLBACK_STATUS
IgPreCreate (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    );

FLT_PREOP_CALLBACK_STATUS
IgPreWrite (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    );

FLT_PREOP_CALLBACK_STATUS
IgPreSetInformation (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    );

FLT_PREOP_CALLBACK_STATUS
IgPreCleanup (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    );

FLT_PREOP_CALLBACK_STATUS
IgPreSetSecurity (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    );

VOID
IgAuthRequestFromFileOperation (
    _In_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _In_ ULONG OperationMask,
    _Out_ PIG_AUTH_REQUEST Request
    );

CONST FLT_OPERATION_REGISTRATION Callbacks[] = {
    { IRP_MJ_CREATE,
      0,
      IgPreCreate,
      NULL },
    { IRP_MJ_WRITE,
      0,
      IgPreWrite,
      NULL },
    { IRP_MJ_SET_INFORMATION,
      0,
      IgPreSetInformation,
      NULL },
    { IRP_MJ_CLEANUP,
      0,
      IgPreCleanup,
      NULL },
    { IRP_MJ_SET_SECURITY,
      0,
      IgPreSetSecurity,
      NULL },
    { IRP_MJ_OPERATION_END }
};

CONST FLT_REGISTRATION FilterRegistration = {
    sizeof( FLT_REGISTRATION ),
    FLT_REGISTRATION_VERSION,
    0,
    NULL,
    Callbacks,
    IgUnload,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
};

NTSTATUS
DriverEntry (
    _In_ PDRIVER_OBJECT DriverObject,
    _In_ PUNICODE_STRING RegistryPath
    )
{
    NTSTATUS status;

    UNREFERENCED_PARAMETER( RegistryPath );

    status = FltRegisterFilter( DriverObject,
                                &FilterRegistration,
                                &gFilterHandle );

    FLT_ASSERT( NT_SUCCESS( status ) );

    if (NT_SUCCESS( status )) {
        status = FltStartFiltering( gFilterHandle );
        if (!NT_SUCCESS( status )) {
            FltUnregisterFilter( gFilterHandle );
        }
    }

    return status;
}

NTSTATUS
IgUnload (
    _In_ FLT_FILTER_UNLOAD_FLAGS Flags
    )
{
    UNREFERENCED_PARAMETER( Flags );

    FltUnregisterFilter( gFilterHandle );

    return STATUS_SUCCESS;
}

VOID
IgAuthRequestFromFileOperation (
    _In_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _In_ ULONG OperationMask,
    _Out_ PIG_AUTH_REQUEST Request
    )
{
    UNREFERENCED_PARAMETER( FltObjects );
    UNREFERENCED_PARAMETER( Data );

    if (Request == NULL) {
        return;
    }

    RtlZeroMemory( Request, sizeof( *Request ) );
    Request->RequestId = (ULONG)KeQueryPerformanceCounter( NULL );
    Request->OperationMask = OperationMask;
    Request->RequestedAccess = Data != NULL ? Data->Iopb->Parameters.Create.SecurityContext->DesiredAccess : 0;
    Request->Classification = 0;
    Request->ProcessId = (ULONG)PsGetCurrentProcessId();
    Request->Timestamp.QuadPart = __rdtsc();
    Request->ExpiresAt.QuadPart = Request->Timestamp.QuadPart + 1000000ULL;
    RtlStringCchCopyW( Request->FilePath, ARRAYSIZE( Request->FilePath ), L"<pending-policy-check>" );
    RtlStringCchCopyW( Request->UserName, ARRAYSIZE( Request->UserName ), L"<service-user>" );
}

FLT_PREOP_CALLBACK_STATUS
IgPreCreate (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    )
{
    IG_AUTH_REQUEST authRequest;

    UNREFERENCED_PARAMETER( CompletionContext );

    IgAuthRequestFromFileOperation( Data, FltObjects, IG_OPERATION_WRITE, &authRequest );

    /*
     * This callback is intentionally not allowed to complete a protected operation
     * without a driver-to-service authorization decision. A production driver must:
     *  - identify the file path and classification from the trusted service,
     *  - pend the operation,
     *  - validate the signed response for the request_id,
     *  - deny denied operations and allow authorized ones.
     *
     * The current project still lacks the signed trust contract, the Windows service
     * IPC, and the production minifilter driver installation path. This placeholder
     * is therefore a contract marker, not a complete enforcement implementation.
     */

    return FLT_PREOP_SUCCESS_NO_CALLBACK;
}

FLT_PREOP_CALLBACK_STATUS
IgPreWrite (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    )
{
    IG_AUTH_REQUEST authRequest;

    UNREFERENCED_PARAMETER( CompletionContext );

    IgAuthRequestFromFileOperation( Data, FltObjects, IG_OPERATION_WRITE, &authRequest );

    return FLT_PREOP_SUCCESS_NO_CALLBACK;
}

FLT_PREOP_CALLBACK_STATUS
IgPreSetInformation (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    )
{
    IG_AUTH_REQUEST authRequest;

    UNREFERENCED_PARAMETER( CompletionContext );

    IgAuthRequestFromFileOperation( Data, FltObjects, IG_OPERATION_SET_INFO | IG_OPERATION_RENAME | IG_OPERATION_DELETE, &authRequest );

    return FLT_PREOP_SUCCESS_NO_CALLBACK;
}

FLT_PREOP_CALLBACK_STATUS
IgPreCleanup (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    )
{
    IG_AUTH_REQUEST authRequest;

    UNREFERENCED_PARAMETER( CompletionContext );

    IgAuthRequestFromFileOperation( Data, FltObjects, IG_OPERATION_DELETE, &authRequest );

    return FLT_PREOP_SUCCESS_NO_CALLBACK;
}

FLT_PREOP_CALLBACK_STATUS
IgPreSetSecurity (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    )
{
    IG_AUTH_REQUEST authRequest;

    UNREFERENCED_PARAMETER( CompletionContext );

    IgAuthRequestFromFileOperation( Data, FltObjects, IG_OPERATION_SET_INFO, &authRequest );

    return FLT_PREOP_SUCCESS_NO_CALLBACK;
}
