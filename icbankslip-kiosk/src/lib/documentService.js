import { supabase } from './supabase'

export const getFileUrl = async (path) => {

  const { data, error } = await supabase.storage
    .from('uploads')
    .createSignedUrl(path, 60)

  if (error) {

    console.error("Signed URL error:", error)

    if (
      error.message.includes("not found") ||
      error.message.includes("Object not found")
    ) {
      throw new Error("FILE_EXPIRED")
    }

    throw error
  }

  return data.signedUrl
}


export const downloadFiles = async (submission) => {

  let icFrontBlob = null
  let icBackBlob = null
  let bankSlipBlob = null

  if (submission.ic_front_path) {

    const url = await getFileUrl(
      submission.ic_front_path
    )

    icFrontBlob =
      await (await fetch(url)).blob()
  }


  if (submission.ic_back_path) {

    const url = await getFileUrl(
      submission.ic_back_path
    )

    icBackBlob =
      await (await fetch(url)).blob()
  }


  if (submission.bank_slip_path) {

    const url = await getFileUrl(
      submission.bank_slip_path
    )

    const response = await fetch(url)

    const blob = await response.blob()

    bankSlipBlob = new File(
      [blob],
      submission.bank_slip_path,
      {
        type: blob.type
      }
    )

    console.log(
      "Bank slip type:",
      bankSlipBlob.type,
      bankSlipBlob.name
    )
  }

  return {
    icFrontBlob,
    icBackBlob,
    bankSlipBlob
  }
}


export const deleteUploadedFiles = async (
  submission,
  kioskName
) => {

  console.log(
    "DELETE FUNCTION CALLED",
    submission
  )

  const {
    data: updateData,
    error: updateError
  } = await supabase
    .from('submissions')
    .update({
      status: "Printed",
      printed_from: kioskName,
      printed_date: new Date().toISOString()
    })
    .eq(
      "id",
      submission.id
    )
    .select()


  console.log("UPDATE RESULT:", {
    updateData,
    updateError
  })


  if (
    updateError ||
    !updateData?.length
  ) {

    console.error(
      "Update status failed:",
      updateError
    )

    throw new Error(
      "STATUS_UPDATE_FAILED"
    )
  }


  const files = [
    submission.ic_front_path,
    submission.ic_back_path,
    submission.bank_slip_path
  ].filter(Boolean)


  console.log(
    "Attempting to delete:",
    files
  )

  const storage =
    supabase.storage.from('uploads')

  const {
    data: deleteResult,
    error: deleteError
  } = await storage.remove(files)


  if (deleteError) {

    console.error(
      "Delete failed:",
      deleteError
    )
  }


  console.log(
    "BULK DELETE RESULT:",
    {
      deleteResult,
      deleteError
    }
  )

  console.log(
    "Storage delete test completed"
  )
}